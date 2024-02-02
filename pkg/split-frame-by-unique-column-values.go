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
	// values are converted from pointers to their types for later comparasion
	rows := frame.Rows()
	for i := 0; i < rows; i++ {
		value := frame.At(columnId, i)
		switch typeValue := value.(type) {
		case *string:
			uniqueValues[*typeValue] = 0
		case *int64:
			uniqueValues[*typeValue] = 0
		case *float64:
			uniqueValues[*typeValue] = 0
		default:
			uniqueValues[nil] = 0
		}
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
			groupByArgs[i] = strings.TrimSpace(arg)
			// $__interval is a duaration of time as a string
			// if current arg is parasable its $__interval, skip it
			_, err := time.ParseDuration(groupByArgs[i])
			if err != nil {
				idx = i
				break
			}
		}
		log.DefaultLogger.Debug("comapring columns")
		for colId, colName := range fields {
			colName.Name = strings.TrimSpace(colName.Name)
			log.DefaultLogger.Debug(fmt.Sprintf("%d", colId))
			log.DefaultLogger.Debug(fmt.Sprintf("'%s'", colName.Name))
			log.DefaultLogger.Debug(fmt.Sprintf("'%s'", groupByArgs[idx]))
			if colName.Name == groupByArgs[idx] {
				return true, colId, groupByArgs[idx]
			}
		}
		log.DefaultLogger.Warn(fmt.Sprintf("Cant find %s column, defaulting to standard formating", groupByArgs[idx]))
	}
	return false, 0, ""
}

func FilterDataFrameByType(df *data.Frame, typeValue interface{}, columnId int) (*data.Frame, error) {
	// returns new frame where all rows match typeValue in given column
	filterCondition := func(i interface{}) (bool, error) {
		switch t := i.(type) {
		case *string:
			return *t == typeValue, nil
		case *int64:
			return *t == typeValue, nil
		case *float64:
			return *t == typeValue, nil
		default:
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
	uniqueTypes, _ := GetUniqueColumnValues(frame, columnIndex)
	for _, typeValue := range uniqueTypes {
		tmpFrame, _ := FilterDataFrameByType(frame, typeValue, columnIndex)
		tmpFrame.Name = fmt.Sprintf("%s %s,", name, typeValue)
		splitFrames = append(splitFrames, tmpFrame)
	}
	return splitFrames
}
