package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"
    "bytes"
    "io/ioutil"
	"net/http"
	"strconv"
	"regexp"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/datasource"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

// newDatasource returns datasource.ServeOpts.
func newDatasource() datasource.ServeOpts {
	// creates a instance manager for your plugin. The function passed
	// into `NewInstanceManger` is called when the instance is created
	// for the first time or when a datasource configuration changed.
	im := datasource.NewInstanceManager(newDataSourceInstance)
	ds := &SampleDatasource{
		im: im,
	}

	return datasource.ServeOpts{
		QueryDataHandler:   ds,
		CheckHealthHandler: ds,
	}
}

// SampleDatasource is an example datasource used to scaffold
// new datasource plugins with an backend.
type SampleDatasource struct {
	// The instance manager can help with lifecycle management
	// of datasource instances in plugins. It's not a requirements
	// but a best practice that we recommend that you follow.
	im instancemgmt.InstanceManager
}

type QdbToken struct {
	// token
	Token string `json:"token,omitempty"`
}

type QdbCredential struct {
	SecretKey string `json:"secret_key,omitempty"`
	Username string `json:"user,omitempty"`
}

type QdbQuery struct {
	Query string `json:"query,omitempty"`
}

type QueryResult struct {
	Tables []*QueryTable `json:"tables"`
}

type QueryColumn struct {
	Data []interface{} `json:"data"`
	Name string `json:"name,omitempty"`
	Type string `json:"type,omitempty"`
}

type QueryTable struct {
	Columns []*QueryColumn `json:"columns"`
	Name string `json:"name,omitempty"`
}

type queryModel struct {
	Format string `json:"format"`
	QueryText string `json:"queryText"`
	TagQuery bool `json:"tagQuery"`
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifer).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (td *SampleDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	log.DefaultLogger.Info("QueryData", "request", req)

	log.DefaultLogger.Info(fmt.Sprintf("----------- QueryData -----------"))
	// create response struct
	response := backend.NewQueryDataResponse()
	
	instance, err := td.im.Get(req.PluginContext)
	if err != nil {
		return nil, err
	}
	instSetting, _ := instance.(*instanceSettings)
	
	host := instSetting.host
	if host == "" {
		return nil, fmt.Errorf("Host cannot be empty")
	}

	credential := instSetting.credential
    loginRequest, err := json.Marshal(credential)
    loginResponse, err := http.Post(fmt.Sprintf("%s/api/login", host), "application/json; charset=utf-8", bytes.NewBuffer(loginRequest))
	if err != nil {
		return nil, err
    }
    defer loginResponse.Body.Close()
    bodyBytes, _ := ioutil.ReadAll(loginResponse.Body)

    var t QdbToken
    json.Unmarshal(bodyBytes, &t)
	token := t.Token
	log.DefaultLogger.Info(fmt.Sprintf("token: %s", token))

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res, err := td.query(ctx, q, host, token)
		if err != nil {
			return nil, err
		}

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = *res
	}

	return response, nil
}

func convertTimestampColumn(data []interface{}) ([]*time.Time, error) {
	out := []*time.Time{}
	layout := "2006-01-02T15:04:05.999999999Z07:00"
	for _, d := range data {
		switch v := d.(type) {
		case string:
			if v == "(void)" {
				out = append(out, nil)
			} else {
				val, err := time.Parse(layout, v)
				if err != nil {
					return nil, err
				}
				out = append(out, &val)
			}
		default:
			out = append(out, nil)
		}
	}
	return out, nil
}

func convertInt64Column(data []interface{}) ([]*int64, error) {
	out := []*int64{}
	for _, d := range data {
		switch v := d.(type) {
		case string:
			if v == "(undefined)" {
				out = append(out, nil)
			} else {
				val, err := strconv.ParseInt(v, 10, 64)
				if err != nil {
					return nil, err
				}
				out = append(out, &val)
			}
		case float64:
			val := int64(v)
			out = append(out, &val)
		case int64:
			out = append(out, &v)
		default:
			out = append(out, nil)
		}
	}
	return out, nil
}

func convertDoubleColumn(data []interface{}) ([]*float64, error) {
	out := []*float64{}
	for _, d := range data {
		switch v := d.(type) {
		case string:
			val, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return nil, err
			}
			out = append(out, &val)
		case float64:
			out = append(out, &v)
		case int64:
			val := float64(v)
			out = append(out, &val)
		default:
			out = append(out, nil)
		}
	}
	return out, nil
}

func convertBlobLikeColumn(data []interface{}) ([]*string, error) {
	out := []*string{}
	for _, d := range data {
		switch v := d.(type) {
		case string:
			out = append(out, &v)
		default:
			out = append(out, nil)
		}
	}
	return out, nil
}

func convertValues(column *QueryColumn) (interface{}, error) {
	switch t := column.Type; t {
		case "timestamp":
			return convertTimestampColumn(column.Data)
		case "int64", "count":
			return convertInt64Column(column.Data)
		case "double":
			return convertDoubleColumn(column.Data)
		case "blob", "string", "symbol":
			return convertBlobLikeColumn(column.Data)
		default:
			return []*string{}, nil
	}
}

func (td *SampleDatasource) query(ctx context.Context, query backend.DataQuery, host string, token string) (*backend.DataResponse, error) {
	// Unmarshal the json into our queryModel
	var qm queryModel
	
	log.DefaultLogger.Info(fmt.Sprintf("Query json: %v", query.JSON))
	

	response := backend.DataResponse{}
	response.Error = json.Unmarshal(query.JSON, &qm)
	if response.Error != nil {
		return nil, response.Error
	}


	q := QdbQuery{
		Query: qm.QueryText,
	}
	log.DefaultLogger.Info(fmt.Sprintf("Query text: %s", q.Query))


	// Log a warning if `Format` is empty.
	if qm.Format == "" {
		log.DefaultLogger.Warn("format is empty. defaulting to time series")
	}
	if q.Query == "" {
		log.DefaultLogger.Warn("query cannot be empty. Aborting...")
		return &response, nil
	}

    queryRequest, err := json.Marshal(q)

	path := fmt.Sprintf("%s/api/query", host)
    req, err := http.NewRequest(http.MethodPost, path, bytes.NewBuffer(queryRequest))
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	
	if qm.TagQuery {
		path = fmt.Sprintf("%s/api/tags", host)
		isTagWhereRegex := regexp.MustCompile(`^show\s+tags\s+where\s+tag\s+~\s+(\S+)$`)
		if isTagWhereRegex.MatchString(qm.QueryText) {
			found := isTagWhereRegex.FindStringSubmatch(qm.QueryText)
			path = fmt.Sprintf("%s/api/tags?regex=%s", host, found[1])
		}
		req, err = http.NewRequest(http.MethodGet, path, nil)
	} else {
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
	}
	
	log.DefaultLogger.Info(fmt.Sprintf("path: %s", path))

    client := &http.Client{}
    queryResponse, err := client.Do(req)
    if err != nil {
		return nil, err
    }
    defer queryResponse.Body.Close()
    bodyBytes, _ := ioutil.ReadAll(queryResponse.Body)

    var queryRes QueryResult
    json.Unmarshal(bodyBytes, &queryRes)

	// TODO(vianney):
	// once everything settles down, return empty dataframe instead
	if len(queryRes.Tables) == 0 {
		return nil, fmt.Errorf("No results")
	}

	if len(queryRes.Tables) > 1 {
		return nil, fmt.Errorf("Multiple tables result are not supported at this time.")
	}

	// create data frame response
	frame := data.NewFrame("response")

	table := queryRes.Tables[0]
	for _, column := range table.Columns {
		values, err := convertValues(column)
		if err != nil {
			return nil, err
		}
		log.DefaultLogger.Info(fmt.Sprintf("values: %v", values))

		frame.Fields = append(frame.Fields,
			data.NewField(column.Name, nil, values),
		)
	}

	// add the frames to the response
	response.Frames = append(response.Frames, frame)

	return &response, nil
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (td *SampleDatasource) CheckHealth(ctx context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	var status = backend.HealthStatusOk
	var message = "Data source is working"

	return &backend.CheckHealthResult{
		Status:  status,
		Message: message,
	}, nil
}

type instanceSettings struct {
	host string
	credential QdbCredential
}

func newDataSourceInstance(setting backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
    type editModel struct {
        Host string `json:"host"`
    }

    var hosts editModel
    err := json.Unmarshal(setting.JSONData, &hosts)
    if err != nil {
        log.DefaultLogger.Warn("error marshalling", "err", err)
        return nil, err
    }

	var secureData = setting.DecryptedSecureJSONData
    user, _ := secureData["user"]
    userPrivateKey, _ := secureData["secret"]
	
	log.DefaultLogger.Info(fmt.Sprintf("user: %s", user))
	log.DefaultLogger.Info(fmt.Sprintf("user private key: %s", userPrivateKey))

	credential := QdbCredential{
		Username: user,
		SecretKey: userPrivateKey,
	}

    log.DefaultLogger.Info(fmt.Sprintf("=======> host: %s", hosts.Host))
	return &instanceSettings{
		host: hosts.Host,
		credential: credential,
	}, nil
}

func (s *instanceSettings) Dispose() {
	// s.handle.Close()
}
