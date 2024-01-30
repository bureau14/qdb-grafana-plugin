package main

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

func GetUniqueColumnValues(frame *data.Frame, columnId int) ([]interface{}, error) {
	// Create a map to store unique values
	uniqueValues := make(map[interface{}]int)
	// Iterate through the rows and collect unique values from the specified column
	rows := frame.Rows()
	for i := 0; i < rows; i++ {
		value := frame.At(columnId, i)
		log.DefaultLogger.Info(fmt.Sprint(value))
		uniqueValues[value] = 0
	}

	// Convert the unique values map to a slice
	var result []interface{}
	for value := range uniqueValues {
		result = append(result, value)
	}
	return result, nil
}

func IsGroupByQuery(query string, fields []*data.Field) (bool, int, string) {
	// this function checks if query includes group by statement,
	// extracts group by arguments, selects first argument that is not $__interval
	// finds column with its name
	// returns true if query includes group by, index of found column

	isGroupByRegex := regexp.MustCompile(`\bGROUP\s+BY\s+(.*?)(\s*(?:ORDER\s+BY|$))`)
	if isGroupByRegex.MatchString(query) {
		// extract args from group by
		groupByArgs := strings.Split(isGroupByRegex.FindStringSubmatch(query)[1], ",")
		idx := 0
		for i, arg := range groupByArgs {
			arg = strings.TrimSpace(arg)
			// $__interval is a duaration of time as a string
			// if current arg is parasable its $__interval, skip it
			_, err := time.ParseDuration(arg)
			if err != nil {
				idx = i
				break
			}
		}
		for colId, colName := range fields {
			if colName.Name == groupByArgs[idx] {
				return true, colId, groupByArgs[idx]
			}
		}
		log.DefaultLogger.Warn(fmt.Sprintf("Cant find %s column", groupByArgs[idx]))
	}
	return false, 0, ""
}

func FilterDataFrameByType(df *data.Frame, typeValue interface{}, columnId int) (*data.Frame, error) {
	// returns new frame where all rows match typeValue in given column
	filterCondition := func(i interface{}) (bool, error) {
		return i == typeValue, nil
	}
	filteredDataFrame, err := df.FilterRowsByField(columnId, filterCondition)
	if err != nil {
		return nil, err
	}

	return filteredDataFrame, nil
}

func SplitByUniqueColumnValues(frame *data.Frame, columnIndex int, name string) (splitFrames []*data.Frame) {
	// return array of data.Frame
	uniqueTypes, _ := GetUniqueColumnValues(frame, columnIndex)
	for _, typeValue := range uniqueTypes {
		tmpFrame, _ := FilterDataFrameByType(frame, typeValue, columnIndex)

		switch typeValue := typeValue.(type) {
		case *string:
			tmpFrame.Name = fmt.Sprintf("%s %s,", name, *typeValue)
		case *int64:
			tmpFrame.Name = fmt.Sprintf("%s %d,", name, *typeValue)
		case *float64:
			tmpFrame.Name = fmt.Sprintf("%s %e,", name, *typeValue)
		default:
			tmpFrame.Name = fmt.Sprintf("%s %s,", name, "")
		}
		splitFrames = append(splitFrames, tmpFrame)
	}
	return splitFrames
}
