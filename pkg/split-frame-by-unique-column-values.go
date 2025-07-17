package main

import (
	"fmt"
	"reflect"
	"regexp"
	"strings"

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
	// returns true if query includes group by, index of found column, name of found column

	// check if query includes GROUP BY
	groupByRegex := regexp.MustCompile(`(?i)group\s+by\s+([A-Za-z0-9_]+(?:\s*,\s*[A-Za-z0-9_]+)*)`)
	matches := groupByRegex.FindStringSubmatch(query)
	log.DefaultLogger.Debug(fmt.Sprintf("GROUP BY regex result: %v", matches))
	if len(matches) < 2 || matches[1] == "" {
		log.DefaultLogger.Warn(fmt.Sprintf("No valid GROUP BY columns found in query: %s", query))
		return false, 0, ""
	}

	// extract group by arguments from regex match
	groupByArgsString := matches[1]
	groupByArgs := strings.Split(groupByArgsString, ",")
	for i, arg := range groupByArgs {
		groupByArgs[i] = strings.TrimSpace(arg)
	}

	for _, groupByArg := range groupByArgs {
		log.DefaultLogger.Debug(fmt.Sprintf("Checking if %s exists in data fields", groupByArg))
		for idx, field := range fields {
			// only sets idx if argument actually exists as a field in the data frame
			// this ensures we're select a real column from the data frame
			if field.Name == groupByArg {
				log.DefaultLogger.Debug(fmt.Sprintf("Found %s in data fields", groupByArg))
				return true, idx, groupByArg
			}
		}
		log.DefaultLogger.Debug(fmt.Sprintf("Did not find %s in data fields", groupByArg))
	}
	log.DefaultLogger.Warn("Can't find any GROUP BY columns in data frame, defaulting to standard formatting")
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
	for _, typeValue := range uniqueTypes {
		tmpFrame, _ := FilterDataFrameByType(frame, typeValue, columnIndex)
		tmpFrame.Name = fmt.Sprintf("%s%s ", name, fmt.Sprint(typeValue))
		tmpFrame.Fields[columnIndex].Labels = map[string]string{
			name: fmt.Sprint(typeValue),
		}
		log.DefaultLogger.Debug(fmt.Sprintf("frame name: %s", tmpFrame.Name))
		splitFrames = append(splitFrames, tmpFrame)
	}
	return splitFrames
}
