package main

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
)

func GetUniqueColumnValues(frame *data.Frame, columnId int) ([]interface{}, error) {
	// Create a map to store unique values
	uniqueValues := make(map[interface{}]nil)
	// Iterate through the rows and collect unique values from the specified column
	rows := frame.Rows()
	for i := 0; i < rows; i++ {
		value := frame.At(columnId, i)
		log.DefaultLogger.Info(fmt.Sprint(value))
		uniqueValues[value] = nil
	}

	// Convert the unique values map to a slice
	var result []interface{}
	for value := range uniqueValues {
		result = append(result, value)
	}
	return result, nil
}

func IsGroupByQuery(query string, fields []*data.Field) (isGroupBy bool, index int) {
	isGroupByRegex := regexp.MustCompile(`\bGROUP\s+BY\s+(.*?)(\s*(?:ORDER\s+BY|$))`)
	if isGroupByRegex.MatchString(query) {
		// extract args from group by
		groupByArgs := strings.Split(isGroupByRegex.FindStringSubmatch(query)[1], ",")
		// intervalRegex = regexp.MustCompile(`\d*ms`)
		idx := 0
		for _, arg := range groupByArgs {
			// TODO ignore $__interval, return first after (?)
			arg = strings.TrimSpace(arg)
		}
		columnName := groupByArgs[idx]
		for colId, colName := range fields {
			if colName.Name == columnName {
				return true, colId
			}
		}
		log.DefaultLogger.Warn(fmt.Sprintf("Cant find %s column", columnName))
	}
	return false, 0
}

func FilterDataFrameByType(df *data.Frame, typeValue interface{}, columnId int) (*data.Frame, error) {
	filterCondition := func(i interface{}) (bool, error) {
		return i == typeValue, nil
	}
	// Apply the filter
	filteredDataFrame, err := df.FilterRowsByField(columnId, filterCondition)
	if err != nil {
		return nil, err
	}

	return filteredDataFrame, nil
}

func SplitByUniqueColumnValues(frame *data.Frame, columnIndex int) (splitFrames []*data.Frame) {
	uniqueTypes, _ := GetUniqueColumnValues(frame, columnIndex)
	for _, typeValue := range uniqueTypes {
		tmpFrame, _ := FilterDataFrameByType(frame, typeValue, columnIndex)

		switch typeValue := typeValue.(type) {
		case *string:
			tmpFrame.Name = fmt.Sprint(*typeValue)
		case *int64:
			tmpFrame.Name = fmt.Sprint(*typeValue)
		case *float64:
			tmpFrame.Name = fmt.Sprint(*typeValue)
		default:
			tmpFrame.Name = "_"
		}
		splitFrames = append(splitFrames, tmpFrame)
	}
	return splitFrames
}
