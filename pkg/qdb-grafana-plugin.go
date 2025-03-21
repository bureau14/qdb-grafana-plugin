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
    "crypto/tls"

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
	Token string `json:"token"`
}

type QdbError struct {
	Message string `json:"message,omitempty"`
}

type QdbCredential struct {
	SecretKey string `json:"secret_key,omitempty"`
	Username string `json:"username,omitempty"`
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

type instanceSettings struct {
	host string
	token string
	credential QdbCredential
}

type queryModel struct {
	Format string `json:"format"`
	QueryText string `json:"queryText"`
	TagQuery bool `json:"tagQuery"`
}

type ResetTokenError struct {
}


func (e *ResetTokenError) Error() string {
	return fmt.Sprintf("Issuing token reset.")
}

func makeClient() *http.Client {
	return &http.Client{
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true,
			},
		},
	}
}

func getToken(settings *instanceSettings) (string, error) {
	if settings.token == "" {
		log.DefaultLogger.Debug(fmt.Sprintf("Retrieving token"))
		host := settings.host
		if host == "" {
			errMsg := "Host cannot be empty"
			log.DefaultLogger.Error(errMsg)
			return "", fmt.Errorf(errMsg)
		}
		credential := settings.credential

    	loginRequest, err := json.Marshal(credential)
    	if err != nil {
			log.DefaultLogger.Error(err.Error())
			return "", err
    	}

		path := fmt.Sprintf("%s/api/login", host)
		loginReq, err := http.NewRequest(http.MethodPost, path, bytes.NewBuffer(loginRequest))
		loginReq.Header.Set("Content-Type", "application/json; charset=utf-8")

		if credential.Username == "" {
			log.DefaultLogger.Debug(fmt.Sprintf("Login anonymously to endpoint '%s'", host))
		} else {
			log.DefaultLogger.Debug(fmt.Sprintf("Login '%s' to endpoint '%s'", credential.Username, host))
		}

		client := makeClient()
    	loginResponse, err := client.Do(loginReq)
    	if err != nil {
			log.DefaultLogger.Error(err.Error())
			return "", err
    	}
    	defer loginResponse.Body.Close()
    	bodyBytes, _ := ioutil.ReadAll(loginResponse.Body)

    	var t QdbToken
    	json.Unmarshal(bodyBytes, &t)
		settings.token = t.Token
		if settings.token == "" {
			var e QdbError
			json.Unmarshal(bodyBytes, &e)
			log.DefaultLogger.Error(e.Message)
			return "", fmt.Errorf("%s", e.Message)
		}
	}
	return settings.token, nil
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifer).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (td *SampleDatasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	log.DefaultLogger.Debug("QueryData", "request", req)

	// create response struct
	response := backend.NewQueryDataResponse()

	instance, err := td.im.Get(req.PluginContext)
	if err != nil {
		return nil, err
	}
	settings, _ := instance.(*instanceSettings)

	host := settings.host
	token, err := getToken(settings)
	if err != nil {
		return nil, err
	}

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res, err := td.query(ctx, q, host, token)
		if err != nil {
			switch err.(type) {
			case *ResetTokenError:
				log.DefaultLogger.Warn("Token reset.")
				settings.token = ""
				token, err = getToken(settings)
				res, err = td.query(ctx, q, host, token)
				if err != nil {
					log.DefaultLogger.Error(err.Error())
					return nil, err
				}
			default:
				log.DefaultLogger.Error(err.Error())
				return nil, err
		   }
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

func convertValues(column *QueryColumn, rowCount int) (interface{}, error) {
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
			return make([]*string, rowCount), nil
	}
}

func makeRequest(host string, query queryModel) (*http.Request, error) {
	if query.TagQuery {
		path := fmt.Sprintf("%s/api/tags", host)
		isTagWhereRegex := regexp.MustCompile(`^show\s+tags\s+where\s+tag\s+~\s+(\S+)$`)
		if isTagWhereRegex.MatchString(query.QueryText) {
			found := isTagWhereRegex.FindStringSubmatch(query.QueryText)
			path = fmt.Sprintf("%s/api/tags?regex=%s", host, found[1])
		}
		log.DefaultLogger.Debug(fmt.Sprintf("Request path: %s", path))
		return http.NewRequest(http.MethodGet, path, nil)
	} else {
		q := QdbQuery{
			Query: query.QueryText,
		}
		queryRequest, err := json.Marshal(q)

		path := fmt.Sprintf("%s/api/query", host)
		log.DefaultLogger.Debug(fmt.Sprintf("Request path: %s", path))

		req, err := http.NewRequest(http.MethodPost, path, bytes.NewBuffer(queryRequest))
		req.Header.Set("Content-Type", "application/json; charset=utf-8")
		return req, err
	}
}

func (td *SampleDatasource) query(ctx context.Context, query backend.DataQuery, host string, token string) (*backend.DataResponse, error) {
	// Unmarshal the json into our queryModel
	var qm queryModel

	response := backend.DataResponse{}
	response.Error = json.Unmarshal(query.JSON, &qm)
	if response.Error != nil {
		return &response, nil
	}

	// Log a warning if `Format` is empty.
	if qm.Format == "" {
		log.DefaultLogger.Warn("format is empty. defaulting to time series")
	}
	if qm.QueryText == "" {
		response.Error = fmt.Errorf("Error: query cannot be empty. Aborting...")
		return &response, nil
	}

	req, err := makeRequest(host, qm)
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	log.DefaultLogger.Debug(fmt.Sprintf("query: %s", qm.QueryText))

	client := makeClient()
    queryResponse, err := client.Do(req)
    if err != nil {
		log.DefaultLogger.Error(fmt.Sprintf("Response: %v", queryResponse))
		response.Error = err
		return &response, nil
    }
    defer queryResponse.Body.Close()
    bodyBytes, _ := ioutil.ReadAll(queryResponse.Body)

	if queryResponse.StatusCode == 401 {
		return nil, &ResetTokenError{}
	}

    var queryRes QueryResult
    json.Unmarshal(bodyBytes, &queryRes)
	
	log.DefaultLogger.Debug(fmt.Sprintf("Table count: %d", len(queryRes.Tables)))

	if len(queryRes.Tables) == 0 {
		var e QdbError
		json.Unmarshal(bodyBytes, &e)
		if e.Message != "" {
			// if connection was reset the handle is probably not valid anymore
			// might as well issue a new one
			// which is what we do on ResetTokenError
			if e.Message == "Connection reset by peer." {
				return nil, &ResetTokenError{}
			}
			if e.Message == "An entry matching the provided alias cannot be found." {
				re := regexp.MustCompile(`(?i)FROM (\$__comma\()?FIND`)
				if ok := re.MatchString(qm.QueryText); ok {
					// There is a semantic difference when you try to find a tag
					return &response, nil
				}
			}
			response.Error = fmt.Errorf("Error: '%s'", qm.QueryText, e.Message)
			return &response, nil
		}
		// consider that an empty result is not an error
		// send back empty response, log info
		log.DefaultLogger.Info("Response is empty")
		return &response, nil
	}

	// this handles tag queries
	tagQueryPattern := regexp.MustCompile(`^find\(tag=.*\)$`)	// e.g: find(tag='some-tag')
	if tagQueryPattern.MatchString(qm.QueryText) {
		frame := data.NewFrame(qm.QueryText)
		var tableNames []string
		for _, table := range queryRes.Tables {
			tableNames = append(tableNames, table.Name)
		}
		// append table names to new field named after QueryText
		frame.Fields = append(frame.Fields,
			data.NewField(qm.QueryText, nil, tableNames),
		)
		response.Frames = append(response.Frames, frame)
		return &response, nil
	}

	if len(queryRes.Tables) > 1 {
		response.Error = fmt.Errorf("Error: Multiple tables result are not supported at this time.")
		return &response, nil
	}

	// create data frame response
	frame := data.NewFrame(qm.QueryText)

	table := queryRes.Tables[0]
	log.DefaultLogger.Debug(fmt.Sprintf("Column count: %d", len(table.Columns)))
	rowCount := 0
	for _, column := range table.Columns {
		if rowCount == 0 {
			rowCount = len(column.Data)
		}

		values, err := convertValues(column, rowCount)
		if err != nil {
			return nil, err
		}

		frame.Fields = append(frame.Fields,
			data.NewField(column.Name, nil, values),
		)
	}
	log.DefaultLogger.Debug(fmt.Sprintf("Row count: %d", rowCount))

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

	instance, err := td.im.Get(req.PluginContext)
	if err != nil {
		return nil, err
	}
	settings, _ := instance.(*instanceSettings)

	_, err = getToken(settings)
	if err != nil {
		status = backend.HealthStatusError
		message = err.Error()
	}

	return &backend.CheckHealthResult{
		Status:  status,
		Message: message,
	}, nil
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

	credential := QdbCredential{
		Username: user,
		SecretKey: userPrivateKey,
	}

	return &instanceSettings{
		host: hosts.Host,
		credential: credential,
	}, nil
}

func (s *instanceSettings) Dispose() {
}
