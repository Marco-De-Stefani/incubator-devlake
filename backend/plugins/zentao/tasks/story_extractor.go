/*
Licensed to the Apache Software Foundation (ASF) under one or more
contributor license agreements.  See the NOTICE file distributed with
this work for additional information regarding copyright ownership.
The ASF licenses this file to You under the Apache License, Version 2.0
(the "License"); you may not use this file except in compliance with
the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package tasks

import (
	"encoding/json"

	"github.com/apache/incubator-devlake/core/errors"
	"github.com/apache/incubator-devlake/core/plugin"
	"github.com/apache/incubator-devlake/helpers/pluginhelper/api"
	"github.com/apache/incubator-devlake/plugins/zentao/models"
)

var _ plugin.SubTaskEntryPoint = ExtractStory

var ExtractStoryMeta = plugin.SubTaskMeta{
	Name:             "extractStory",
	EntryPoint:       ExtractStory,
	EnabledByDefault: true,
	Description:      "extract Zentao story",
	DomainTypes:      []string{plugin.DOMAIN_TYPE_TICKET},
}

func ExtractStory(taskCtx plugin.SubTaskContext) errors.Error {
	data := taskCtx.GetData().(*ZentaoTaskData)

	// this collect only work for product
	if data.Options.ProductId == 0 {
		return nil
	}

	extractor, err := api.NewApiExtractor(api.ApiExtractorArgs{
		RawDataSubTaskArgs: api.RawDataSubTaskArgs{
			Ctx: taskCtx,
			Params: ZentaoApiParams{
				ConnectionId: data.Options.ConnectionId,
				ProductId:    data.Options.ProductId,
				ProjectId:    data.Options.ProjectId,
			},
			Table: RAW_STORY_TABLE,
		},
		Extract: func(row *api.RawData) ([]interface{}, errors.Error) {
			res := &models.ZentaoStoryRes{}
			err := json.Unmarshal(row.Data, res)
			if err != nil {
				return nil, errors.Default.WrapRaw(err)
			}
			story := &models.ZentaoStory{
				ConnectionId:     data.Options.ConnectionId,
				ID:               res.ID,
				Product:          res.Product,
				Branch:           res.Branch,
				Version:          res.Version,
				OrderIn:          0,
				Vision:           res.Vision,
				Parent:           res.Parent,
				Module:           res.Module,
				Plan:             res.Plan,
				Source:           res.Source,
				SourceNote:       res.SourceNote,
				FromBug:          res.FromBug,
				Feedback:         res.Feedback,
				Title:            res.Title,
				Keywords:         res.Keywords,
				Type:             res.Type,
				Category:         res.Category,
				Pri:              res.Pri,
				Estimate:         res.Estimate,
				Status:           res.Status,
				SubStatus:        res.SubStatus,
				Color:            res.Color,
				Stage:            res.Stage,
				Lib:              res.Lib,
				FromStory:        res.FromStory,
				FromVersion:      res.FromVersion,
				OpenedById:       getAccountId(res.OpenedBy),
				OpenedByName:     getAccountName(res.OpenedBy),
				OpenedDate:       res.OpenedDate,
				AssignedToId:     getAccountId(res.AssignedTo),
				AssignedToName:   getAccountName(res.AssignedTo),
				AssignedDate:     res.AssignedDate,
				ApprovedDate:     res.ApprovedDate,
				LastEditedId:     getAccountId(res.LastEditedBy),
				LastEditedDate:   res.LastEditedDate,
				ChangedDate:      res.ChangedDate,
				ReviewedById:     getAccountId(res.ReviewedBy),
				ReviewedDate:     res.ReviewedDate,
				ClosedId:         getAccountId(res.ClosedBy),
				ClosedDate:       res.ClosedDate,
				ClosedReason:     res.ClosedReason,
				ActivatedDate:    res.ActivatedDate,
				ToBug:            res.ToBug,
				ChildStories:     res.ChildStories,
				LinkStories:      res.LinkStories,
				LinkRequirements: res.LinkRequirements,
				DuplicateStory:   res.DuplicateStory,
				StoryChanged:     res.StoryChanged,
				FeedbackBy:       res.FeedbackBy,
				NotifyEmail:      res.NotifyEmail,
				URChanged:        res.URChanged,
				Deleted:          res.Deleted,
				PriOrder:         res.PriOrder,
				PlanTitle:        res.PlanTitle,
				Actions:          res.Actions,
			}
			results := make([]interface{}, 0)
			results = append(results, story)
			return results, nil
		},
	})

	if err != nil {
		return err
	}

	return extractor.Execute()
}
