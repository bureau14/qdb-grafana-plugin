//go:build integration

// Integration tests against a live qdb_rest and the cluster seeded by
// scripts/tests/rest-setup/utils.sh (qdbsh_seed_db): tables foo/bar/baz_0{1,2,3},
// each tagged tag_0{1,2,3}, the tags attached to $qdb.tagroot.
//
//	QDB_REST_URI=http://127.0.0.1:40080 go test -tags integration ./pkg/...
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

const defaultRestURI = "http://127.0.0.1:40080"

func restURI() string {
	if u := os.Getenv("QDB_REST_URI"); u != "" {
		return u
	}
	return defaultRestURI
}

// pluginContext addresses one anonymous datasource instance at the REST server.
func pluginContext(t *testing.T) backend.PluginContext {
	t.Helper()
	j, err := json.Marshal(map[string]string{"host": restURI()})
	if err != nil {
		t.Fatal(err)
	}
	return backend.PluginContext{
		DataSourceInstanceSettings: &backend.DataSourceInstanceSettings{
			ID:       1,
			JSONData: j,
			Updated:  time.Unix(0, 0),
		},
	}
}

func newTestDatasource() *SampleDatasource {
	return &SampleDatasource{im: datasource.NewInstanceManager(newDataSourceInstance)}
}

func dataQuery(t *testing.T, m queryModel) backend.DataQuery {
	t.Helper()
	j, err := json.Marshal(m)
	if err != nil {
		t.Fatal(err)
	}
	return backend.DataQuery{RefID: "A", JSON: j}
}

// runQuery sends one query through QueryData, the path Grafana uses.
func runQuery(t *testing.T, ds *SampleDatasource, m queryModel) backend.DataResponse {
	t.Helper()
	req := &backend.QueryDataRequest{
		PluginContext: pluginContext(t),
		Queries:       []backend.DataQuery{dataQuery(t, m)},
	}
	res, err := ds.QueryData(context.Background(), req)
	if err != nil {
		t.Fatalf("QueryData(%q): %v", m.QueryText, err)
	}
	return res.Responses["A"]
}

func runOK(t *testing.T, m queryModel) []*data.Frame {
	t.Helper()
	r := runQuery(t, newTestDatasource(), m)
	if r.Error != nil {
		t.Fatalf("query %q: %v", m.QueryText, r.Error)
	}
	return r.Frames
}

func singleFrame(t *testing.T, fs []*data.Frame) *data.Frame {
	t.Helper()
	if len(fs) != 1 {
		t.Fatalf("got %d frames, want 1", len(fs))
	}
	return fs[0]
}

func fieldByName(t *testing.T, f *data.Frame, name string) *data.Field {
	t.Helper()
	for _, x := range f.Fields {
		if x.Name == name {
			return x
		}
	}
	t.Fatalf("frame has no field %q", name)
	return nil
}

// strings, floats and times read a field back into plain values, whether it
// holds pointers (nullable) or values.
func stringValues(fl *data.Field) []string {
	out := make([]string, 0, fl.Len())
	for i := 0; i < fl.Len(); i++ {
		switch v := fl.At(i).(type) {
		case *string:
			out = append(out, *v)
		case string:
			out = append(out, v)
		}
	}
	return out
}

func floatValues(fl *data.Field) []float64 {
	out := make([]float64, 0, fl.Len())
	for i := 0; i < fl.Len(); i++ {
		switch v := fl.At(i).(type) {
		case *float64:
			out = append(out, *v)
		case float64:
			out = append(out, v)
		}
	}
	return out
}

func timeValues(fl *data.Field) []time.Time {
	out := make([]time.Time, 0, fl.Len())
	for i := 0; i < fl.Len(); i++ {
		switch v := fl.At(i).(type) {
		case *time.Time:
			out = append(out, v.UTC())
		case time.Time:
			out = append(out, v.UTC())
		}
	}
	return out
}

func assertEqual(t *testing.T, what string, want, got interface{}) {
	t.Helper()
	if fmt.Sprint(want) != fmt.Sprint(got) {
		t.Errorf("%s: want %v, got %v", what, want, got)
	}
}

var seededDays = []time.Time{
	time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC),
	time.Date(2020, 1, 2, 0, 0, 0, 0, time.UTC),
	time.Date(2020, 1, 3, 0, 0, 0, 0, time.UTC),
}

func TestIntegrationHealthLogsInAnonymously(t *testing.T) {
	ds := newTestDatasource()
	res, err := ds.CheckHealth(context.Background(), &backend.CheckHealthRequest{PluginContext: pluginContext(t)})
	if err != nil {
		t.Fatal(err)
	}
	if res.Status != backend.HealthStatusOk {
		t.Fatalf("health: %v %q", res.Status, res.Message)
	}
}

func TestIntegrationQuerySingleTable(t *testing.T) {
	f := singleFrame(t, runOK(t, queryModel{QueryText: "select $timestamp, value from foo_01"}))
	assertEqual(t, "timestamps", seededDays, timeValues(fieldByName(t, f, "$timestamp")))
	assertEqual(t, "values", []float64{1, 2, 3}, floatValues(fieldByName(t, f, "value")))
}

func TestIntegrationQueryLongToWideSplitsPerTable(t *testing.T) {
	fs := runOK(t, queryModel{QueryText: "select $timestamp, $table, value from find(tag='tag_01')"})
	if len(fs) != 3 {
		t.Fatalf("got %d frames, want one per table (3)", len(fs))
	}
	got := map[string][]float64{}
	for _, f := range fs {
		v := f.Fields[1]
		got[v.Labels["$table"]] = floatValues(v)
		assertEqual(t, "timestamps of "+v.Labels["$table"], seededDays, timeValues(f.Fields[0]))
	}
	assertEqual(t, "values per table",
		map[string][]float64{"foo_01": {1, 2, 3}, "bar_01": {10, 11, 12}, "baz_01": {19, 20, 21}}, got)
}

func TestIntegrationFindTagListsTables(t *testing.T) {
	q := "find(tag='tag_01')"
	f := singleFrame(t, runOK(t, queryModel{QueryText: q}))
	assertEqual(t, "tables", []string{"bar_01", "baz_01", "foo_01"}, stringValues(fieldByName(t, f, q)))
}

func TestIntegrationShowTags(t *testing.T) {
	f := singleFrame(t, runOK(t, queryModel{QueryText: "show tags", TagQuery: true}))
	assertEqual(t, "tags", []string{"tag_01", "tag_02", "tag_03"}, stringValues(fieldByName(t, f, "name")))
}

func TestIntegrationShowTagsWhereRegex(t *testing.T) {
	f := singleFrame(t, runOK(t, queryModel{QueryText: "show tags where tag ~ _0[12]$", TagQuery: true}))
	assertEqual(t, "tags", []string{"tag_01", "tag_02"}, stringValues(fieldByName(t, f, "name")))
}

func TestIntegrationUnknownTableIsAnError(t *testing.T) {
	r := runQuery(t, newTestDatasource(), queryModel{QueryText: "select * from nosuch"})
	if r.Error == nil || !strings.Contains(r.Error.Error(), "cannot be found") {
		t.Fatalf("want a 'cannot be found' error, got %v", r.Error)
	}
}

// A rejected token (expired, or from a restarted server) must trigger one
// re-login and a retry, not an error.
func TestIntegrationRejectedTokenLogsInAgain(t *testing.T) {
	ds := newTestDatasource()
	inst, err := ds.im.Get(pluginContext(t))
	if err != nil {
		t.Fatal(err)
	}
	inst.(*instanceSettings).token = "rejected"

	r := runQuery(t, ds, queryModel{QueryText: "select $timestamp, value from foo_01"})
	if r.Error != nil {
		t.Fatalf("query after token reset: %v", r.Error)
	}
	if inst.(*instanceSettings).token == "rejected" {
		t.Fatal("token was not replaced")
	}
}
