/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import styled from 'styled-components';

export const CrossDomain = styled.div`
  .radio {
  }

  .radio-item {
    display: flex;
    margin-top: 24px;
  }

  .input {
    display: flex;
    align-items: center;
    margin-bottom: 8px;

    .bp4-input-group {
      margin-right: 8px;
      width: 680px;
    }
  }
`;

export const DialogBody = styled.div`
  ul {
    padding: 8px 16px;
    background: #efefef;
  }

  .search {
    display: flex;
    align-items: center;

    .bp4-input-group {
      margin-right: 24px;
      width: 360px;
    }
  }
`;
