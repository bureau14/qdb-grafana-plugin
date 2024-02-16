package main

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

func GetUniqueColumnValues(frame *data.Frame, columnId int) []interface{} {
	// Create a map to store unique values
	uniqueValues := make(map[interface{}]int)
	// Iterate through the rows and collect unique values from the specified column
	// values are converted from pointers to their types for later comparasion
	// if pointer is null, skip appending it to hash map it
	rows := frame.Rows()
	for i := 0; i < rows; i++ {
		value := frame.At(columnId, i)
		if reflect.ValueOf(value).IsNil() {
			continue
		}
		switch typeValue := value.(type) {
		case *string:
			uniqueValues[*typeValue] = 0
		case *int64:
			uniqueValues[*typeValue] = 0
		case *float64:
			uniqueValues[*typeValue] = 0
		default:
			log.DefaultLogger.Error(fmt.Sprintf("got unhandled type: %s", typeValue))
		}
	}

	// Convert the unique values map to a slice
	var result []interface{}
	for value := range uniqueValues {
		result = append(result, value)
	}
	return result
}

func IsGroupByQuery(query string, fields []*data.Field) (bool, int, string) {
	// checks if query includes group by statement:
	// extracts group by arguments, selects first argument that is not $__interval or $timestamp
	// finds column with its name
	// returns true if query includes group by, index of found column, name of found column

	isGroupByRegex := regexp.MustCompile(`(?i)\bSELECT\s+(.*?)\s*(?:FROM).*GROUP\s+BY\s+(.*?)(\s*(?:ORDER\s+BY|$))`)
	if !isGroupByRegex.MatchString(query) {
		log.DefaultLogger.Warn(fmt.Sprintf(query, "is not a group by query, will be treated as standard query"))
		return false, 0, ""
	}
	// extract args from group by, select clauses
	selectArgs := strings.Split(isGroupByRegex.FindStringSubmatch(query)[1], ",")
	groupByArgs := strings.Split(isGroupByRegex.FindStringSubmatch(query)[2], ",")

	// skip queries where there is only one, same argument in select and group by clauses
	// like `select param from table group by param`
	if len(selectArgs) == len(groupByArgs) && len(groupByArgs) == 1 && strings.TrimSpace(groupByArgs[0]) == strings.TrimSpace(selectArgs[0]) {
		log.DefaultLogger.Warn(fmt.Sprintf(query, "will be treated as standard query"))
		return false, 0, ""
	}

	idx := 0
	for i, arg := range groupByArgs {
		groupByArgs[i] = strings.TrimSpace(arg)
		// $__interval is a duaration of time as a string
		// if current arg is parasable its $__interval, skip it
		_, err := time.ParseDuration(groupByArgs[i])
		if err != nil && groupByArgs[i] != "$timestamp" {
			idx = i
			break
		}
	}
	log.DefaultLogger.Debug("comapring columns")
	for colId, colName := range fields {
		colName.Name = strings.TrimSpace(colName.Name)
		if colName.Name == groupByArgs[idx] {
			log.DefaultLogger.Debug(fmt.Sprintf("'%s'", groupByArgs[idx]))
			return true, colId, groupByArgs[idx]
		}
	}
	log.DefaultLogger.Warn(fmt.Sprintf("Cant find %s column, defaulting to standard formating", groupByArgs[idx]))
	return false, 0, ""
}

func FilterDataFrameByType(df *data.Frame, typeValue interface{}, columnId int) (*data.Frame, error) {
	// returns new frame where all rows match typeValue in given column

	// compare values of typevalue and *t
	filterCondition := func(i interface{}) (bool, error) {
		if reflect.ValueOf(i).IsNil() {
			return false, nil
		}
		switch t := i.(type) {
		case *string:
			return *t == typeValue, nil
		case *int64:
			return *t == typeValue, nil
		case *float64:
			return *t == typeValue, nil
		default:
			log.DefaultLogger.Error(fmt.Sprintf("unhandled comapre %s", t))
			return false, nil
		}

	}
	filteredDataFrame, err := df.FilterRowsByField(columnId, filterCondition)
	if err != nil {
		return nil, err
	}

	return filteredDataFrame, nil
}

func SplitByUniqueColumnValues(frame *data.Frame, columnIndex int, name string) (splitFrames []*data.Frame) {
	// return array of data.Frame grouped by unique values
	uniqueTypes := GetUniqueColumnValues(frame, columnIndex)
	// custom display configuration, hides field from visualization, legend
	hideFromVisualization := map[string]interface{}{
		"hideFrom": map[string]bool{
			"viz":     true, // hide from plot
			"legend":  true,
			"tooltip": true,
		},
	}
	for _, typeValue := range uniqueTypes {
		tmpFrame, _ := FilterDataFrameByType(frame, typeValue, columnIndex)
		tmpFrame.Name = fmt.Sprintf("%s %s ", name, fmt.Sprint(typeValue))
		// hide column that is used to group by from visualization, legend
		log.DefaultLogger.Debug("frame name: ", tmpFrame.Name)
		tmpFrame.Fields[columnIndex].Config = &data.FieldConfig{Custom: hideFromVisualization}
		splitFrames = append(splitFrames, tmpFrame)
	}
	return splitFrames
}
