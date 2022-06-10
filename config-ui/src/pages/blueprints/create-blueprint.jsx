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
import React, { Fragment, useEffect, useState, useCallback } from 'react'
// import { useSelector, useDispatch } from 'react-redux'
import { CSSTransition } from 'react-transition-group'
import { useHistory, useLocation, Link } from 'react-router-dom'
import dayjs from '@/utils/time'
import {
  API_PROXY_ENDPOINT,
  ISSUE_TYPES_ENDPOINT,
  ISSUE_FIELDS_ENDPOINT,
  BOARDS_ENDPOINT,
} from '@/config/jiraApiProxy'
import {
  Button,
  Icon,
  Intent,
  Switch,
  FormGroup,
  ButtonGroup,
  RadioGroup,
  Radio,
  InputGroup,
  TagInput,
  Divider,
  Elevation,
  TextArea,
  Tabs,
  Tab,
  Card,
  Popover,
  Tooltip,
  Label,
  MenuItem,
  Position,
  Colors,
  Tag,
} from '@blueprintjs/core'
import { integrationsData } from '@/data/integrations'
import {
  Providers,
  ProviderTypes,
  ProviderIcons,
  ConnectionStatus,
  ConnectionStatusLabels,
} from '@/data/Providers'
import { MultiSelect, Select } from '@blueprintjs/select'
import Nav from '@/components/Nav'
import Sidebar from '@/components/Sidebar'
import AppCrumbs from '@/components/Breadcrumbs'
import Content from '@/components/Content'

import { DataEntities, DataEntityTypes } from '@/data/DataEntities'
import { NullBlueprint } from '@/data/NullBlueprint'
import { NullBlueprintConnection } from '@/data/NullBlueprintConnection'
import { WorkflowSteps, DEFAULT_DATA_ENTITIES, DEFAULT_BOARDS } from '@/data/BlueprintWorkflow'

import useBlueprintManager from '@/hooks/useBlueprintManager'
import usePipelineManager from '@/hooks/usePipelineManager'
import useConnectionManager from '@/hooks/useConnectionManager'
import useBlueprintValidation from '@/hooks/useBlueprintValidation'
import usePipelineValidation from '@/hooks/usePipelineValidation'
import useConnectionValidation from '@/hooks/useConnectionValidation'
import useJIRA from '@/hooks/useJIRA'

import FormValidationErrors from '@/components/messages/FormValidationErrors'
import InputValidationError from '@/components/validation/InputValidationError'
import ConnectionsSelector from '@/components/blueprints/ConnectionsSelector'
import DataEntitiesSelector from '@/components/blueprints/DataEntitiesSelector'
import BoardsSelector from '@/components/blueprints/BoardsSelector'
import ConnectionDialog from '@/components/blueprints/ConnectionDialog'
import StandardStackedList from '@/components/blueprints/StandardStackedList'
import CodeInspector from '@/components/pipelines/CodeInspector'
import NoData from '@/components/NoData'

import ConnectionTabs from '@/components/blueprints/ConnectionTabs'
import ClearButton from '@/components/ClearButton'
import CronHelp from '@/images/cron-help.png'

const CreateBlueprint = (props) => {
  const history = useHistory()
  // const dispatch = useDispatch()

  const [activeStep, setActiveStep] = useState(WorkflowSteps.find((s) => s.id === 1))
  const [advancedMode, setAdvancedMode] = useState(false)
  const [activeProvider, setActiveProvider] = useState(integrationsData[0])

  const [enabledProviders, setEnabledProviders] = useState([])
  const [runTasks, setRunTasks] = useState([])
  const [runTasksAdvanced, setRunTasksAdvanced] = useState([])
  const [existingTasks, setExistingTasks] = useState([])
  const [rawConfiguration, setRawConfiguration] = useState(
    JSON.stringify([runTasks], null, '  ')
  )
  const [isValidConfiguration, setIsValidConfiguration] = useState(false)
  const [validationError, setValidationError] = useState()

  const [connectionDialogIsOpen, setConnectionDialogIsOpen] = useState(false)
  const [managedConnection, setManagedConnection] = useState(
    NullBlueprintConnection
  )

  const [connectionsList, setConnectionsList] = useState(
    allProviderConnections?.map((c, cIdx) => ({
      ...c,
      id: cIdx,
      name: c.name,
      title: c.name,
      value: c.id,
      status:
        ConnectionStatusLabels[c.status] ||
        ConnectionStatusLabels[ConnectionStatus.OFFLINE],
      provider: c.provider,
      plugin: c.provider,
    }))
  )

  const [dataEntitiesList, setDataEntitiesList] = useState([
    ...DEFAULT_DATA_ENTITIES,
  ])
  const [boardsList, setBoardsList] = useState([...DEFAULT_BOARDS])

  const [blueprintConnections, setBlueprintConnections] = useState([])
  const [configuredConnection, setConfiguredConnection] = useState()
  const [dataEntities, setDataEntities] = useState({})
  const [activeConnectionTab, setActiveConnectionTab] = useState()

  const [showBlueprintInspector, setShowBlueprintInspector] = useState(false)

  const [dataScopes, setDataScopes] = useState([])
  const [transformations, setTransformations] = useState([])

  // @todo: replace with $projects
  const [projectId, setProjectId] = useState([])
  const [projects, setProjects] = useState({})
  const [boards, setBoards] = useState({})
  // @todo: replace with $boards
  const [boardId, setBoardId] = useState([])
  const [connectionId, setConnectionId] = useState('')
  const [connections, setConnections] = useState([])
  const [repositories, setRepositories] = useState([])
  const [selectedConnection, setSelectedConnection] = useState()
  const [repositoryName, setRepositoryName] = useState('')
  const [owner, setOwner] = useState('')
  const [gitExtractorUrl, setGitExtractorUrl] = useState('')
  const [gitExtractorRepoId, setGitExtractorRepoId] = useState('')
  const [selectedGithubRepo, setSelectedGithubRepo] = useState()
  const [refDiffRepoId, setRefDiffRepoId] = useState('')
  const [refDiffPairs, setRefDiffPairs] = useState([])
  const [refDiffTasks, setRefDiffTasks] = useState([
    'calculateCommitsDiff',
    'calculateIssuesDiff',
  ])

  const [configuredProject, setConfiguredProject] = useState(
    projects.length > 0 ? projects[0] : null
  )
  const [configuredBoard, setConfiguredBoard] = useState(
    boards.length > 0 ? boards[0] : null
  )

  const {
    activeConnection,
    // eslint-disable-next-line no-unused-vars
    blueprint,
    // eslint-disable-next-line no-unused-vars
    blueprints,
    name,
    cronConfig,
    customCronConfig,
    // eslint-disable-next-line no-unused-vars
    cronPresets,
    tasks: blueprintTasks,
    settings: blueprintSettings,
    detectedProviderTasks,
    enable,
    setName: setBlueprintName,
    setCronConfig,
    setCustomCronConfig,
    setTasks: setBlueprintTasks,
    setSettings: setBlueprintSettings,
    setDetectedProviderTasks,
    setEnable: setEnableBlueprint,
    // eslint-disable-next-line no-unused-vars
    isFetching: isFetchingBlueprints,
    isSaving,
    createCronExpression: createCron,
    // eslint-disable-next-line no-unused-vars
    getCronSchedule: getSchedule,
    getNextRunDate,
    getCronPreset,
    getCronPresetByConfig,
    saveBlueprint,
    deleteBlueprint,
    isDeleting: isDeletingBlueprint,
    saveComplete: saveBlueprintComplete,
  } = useBlueprintManager()

  const {
    // eslint-disable-next-line no-unused-vars
    validate: validateBlueprint,
    // eslint-disable-next-line no-unused-vars
    errors: blueprintValidationErrors,
    // setErrors: setBlueprintErrors,
    isValid: isValidBlueprint,
    fieldHasError,
    getFieldError,
  } = useBlueprintValidation({
    name,
    cronConfig,
    customCronConfig,
    enable,
    tasks: blueprintTasks,
  })

  const {
    pipelines,
    runPipeline,
    cancelPipeline,
    fetchPipeline,
    fetchAllPipelines,
    pipelineRun,
    buildPipelineStages,
    isRunning,
    isFetchingAll: isFetchingAllPipelines,
    // eslint-disable-next-line no-unused-vars
    errors: pipelineErrors,
    setSettings: setPipelineSettings,
    // eslint-disable-next-line no-unused-vars
    lastRunId,
    // eslint-disable-next-line no-unused-vars
    allowedProviders,
    // eslint-disable-next-line no-unused-vars
    detectPipelineProviders,
  } = usePipelineManager(null, runTasks)

  const {
    validate,
    validateAdvanced,
    errors: validationErrors,
    setErrors: setPipelineErrors,
    isValid: isValidPipelineForm,
    detectedProviders,
  } = usePipelineValidation({
    enabledProviders,
    // pipelineName,
    projectId,
    boardId,
    owner,
    repositoryName,
    connectionId,
    gitExtractorUrl,
    gitExtractorRepoId,
    refDiffRepoId,
    refDiffTasks,
    refDiffPairs,
    tasks: runTasks,
    tasksAdvanced: runTasksAdvanced,
    advancedMode,
  })

  const {
    fetchIssueTypes,
    fetchFields,
    issueTypes,
    fields,
    isFetching: isFetchingJIRA,
    error: jiraProxyError,
  } = useJIRA({
    apiProxyPath: API_PROXY_ENDPOINT,
    issuesEndpoint: ISSUE_TYPES_ENDPOINT,
    fieldsEndpoint: ISSUE_FIELDS_ENDPOINT,
    boardsEndpoint: BOARDS_ENDPOINT,
  })

  const {
    testConnection,
    saveConnection,
    allProviderConnections,
    errors,
    isSaving: isSavingConnection,
    isTesting: isTestingConnection,
    showError,
    testStatus,
    name: connectionName,
    endpointUrl,
    proxy,
    token,
    username,
    password,
    setName,
    setEndpointUrl,
    setProxy,
    setUsername,
    setPassword,
    setToken,
    fetchAllConnections,
    connectionLimitReached,
    // Providers
  } = useConnectionManager({
    activeProvider,
  })

  const {
    validate: validateConnection,
    errors: connectionErrors,
    isValid: isValidConnection,
  } = useConnectionValidation(managedConnection)

  const isValidStep = useCallback((stepId) => {}, [])

  const nextStep = useCallback(() => {
    setActiveStep((aS) =>
      WorkflowSteps.find((s) => s.id === Math.min(aS.id + 1, WorkflowSteps.length))
    )
  }, [WorkflowSteps])

  const prevStep = useCallback(() => {
    setActiveStep((aS) => WorkflowSteps.find((s) => s.id === Math.max(aS.id - 1, 1)))
  }, [WorkflowSteps])

  const handleConnectionTabChange = useCallback(
    (tab) => {
      console.log('>> CONNECTION TAB CHANGED', tab)
      setActiveConnectionTab(tab)
      setConfiguredConnection(
        blueprintConnections.find((c) => c.id === Number(tab.split('-')[1]))
      )
    },
    [blueprintConnections]
  )

  const handleConnectionDialogOpen = () => {
    console.log('>>> MANAGING CONNECTION', managedConnection)
  }

  const handleConnectionDialogClose = () => {
    setConnectionDialogIsOpen(false)
    setManagedConnection(NullBlueprintConnection)
  }

  const getRestrictedDataEntities = useCallback(() => {
    let items = []
    switch (configuredConnection.provider) {
      case Providers.GITLAB:
      case Providers.JIRA:
      case Providers.GITHUB:
        items = dataEntitiesList.filter((d) => d.name !== 'ci-cd')
        break
      case Providers.JENKINS:
        items = dataEntitiesList.filter((d) => d.name == 'ci-cd')
        break
        return items
    }
  }, [dataEntitiesList, configuredConnection])

  const createProviderScopes = useCallback(
    (
      providerId,
      connection,
      connectionIdx,
      entities = [],
      boards = [],
      projects = [],
      defaultScope = { transformation: {}, options: {}, entities: [] }
    ) => {
      console.log(
        '>>> CREATING PROVIDER SCOPE FOR CONNECTION...',
        connectionIdx,
        connection
      )
      let newScope = {
        ...defaultScope,
        entities: entities[connection.id]?.map((entity) => entity.value) || [],
      }
      switch (providerId) {
        case Providers.JIRA:
          newScope = boards[connection.id]?.map((b) => ({
            ...newScope,
            boardId: b.id,
            // @todo: verify transformation payload for jira
            transformation: {},
            options: {
              // @todo: verify initial value of since date for jira provider
              since: new Date(),
            },
          }))
          break
        case Providers.GITLAB:
          newScope = projects[connection.id]?.map((p) => ({
            ...newScope,
            projectId: p,
            // @todo: verify transformation payload for gitlab (none? - no additional settings)
            transformation: {},
          }))
          break
        case Providers.JENKINS:
          // @todo: verify scope settings if any for jenkins
          newScope = {
            ...newScope,
          }
          break
        case Providers.GITHUB:
          newScope = projects[connection.id]?.map((p) => ({
            ...newScope,
            owner: p.split('/')[0],
            repo: p.split('/')[1],
            transformation: {
              prType: 'type/(.*)$',
              prComponent: 'component/(.*)$',
              issueSeverity: 'severity/(.*)$',
              issueComponent: 'component/(.*)$',
              issuePriority: '^(highest|high|medium|low)$',
              issueTypeRequirement: '^(feat|feature|proposal|requirement)$',
              issueTypeBug: '^(bug|failure|error)$',
              issueTypeIncident: '',
            },
          }))
          break
      }
      return Array.isArray(newScope) ? newScope.flat() : [newScope]
    },
    []
  )

  const manageConnection = useCallback((connection) => {
    if (connection?.id) {
      setManagedConnection(connection)
      setConnectionDialogIsOpen(true)
    }
  }, [])

  const addProjectTransformation = (project) => {
    setConfiguredProject(project)
  }

  const addBoardTransformation = (board) => {
    setConfiguredBoard(board)
  }

  useEffect(() => {
    console.log('>> ACTIVE STEP CHANGED: ', activeStep)
    if (activeStep?.id === 1) {
      const enableNotifications = false
      const getAllSources = true
      fetchAllConnections(enableNotifications, getAllSources)
    }
  }, [activeStep])

  useEffect(() => {
    console.log('>>> ALL DATA PROVIDER CONNECTIONS...', allProviderConnections)
    setConnectionsList(
      allProviderConnections?.map((c, cIdx) => ({
        ...c,
        id: cIdx,
        name: c.name,
        title: c.name,
        value: c.id,
        status:
          ConnectionStatusLabels[c.status] ||
          ConnectionStatusLabels[ConnectionStatus.OFFLINE],
        provider: c.provider,
        plugin: c.provider,
      }))
    )
  }, [allProviderConnections])

  useEffect(() => {
    console.log(
      '>> PIPELINE RUN TASK SETTINGS FOR PIPELINE MANAGER ....',
      runTasks
    )
    // setPipelineSettings({
    //   name: pipelineName,
    //   tasks: advancedMode ? runTasksAdvanced : [[...runTasks]]
    // })
    // setRawConfiguration(JSON.stringify(buildPipelineStages(runTasks, true), null, '  '))
    if (advancedMode) {
      validateAdvanced()
      setBlueprintTasks(runTasksAdvanced)
    } else {
      validate()
      setBlueprintTasks([[...runTasks]])
    }
  }, [
    advancedMode,
    runTasks,
    runTasksAdvanced,
    setPipelineSettings,
    validate,
    validateAdvanced,
    setBlueprintTasks,
  ])

  useEffect(() => {
    console.log(
      '>> BLUEPRINT SETTINGS FOR PIPELINE MANAGER ....',
      blueprintSettings
    )
  }, [blueprintSettings])

  const addConnection = () => {
    setManagedConnection(NullBlueprintConnection)
    setConnectionDialogIsOpen(true)
  }

  const renderProviderSettings = useCallback(
    (activeConnection, providerId, activeProvider, dataEntityType) => {
      console.log('>>> RENDERING PROVIDER SETTINGS...')
      let settingsComponent = null
      if (activeProvider && activeProvider.settings) {
        settingsComponent = activeProvider.settings({
          activeProvider,
          activeConnection,
          isSaving,
          isSavingConnection,
          // setSettings,
          // @todo: fix setter
        })
      } else {
        console.log(
          '>> WARNING: NO PROVIDER SETTINGS RENDERED, PROVIDER = ',
          activeProvider
        )
      }
      return settingsComponent
    },
    [isSaving, isSavingConnection]
  )

  useEffect(() => {
    validateBlueprint()
  }, [
    name,
    cronConfig,
    customCronConfig,
    blueprintTasks,
    enable,
    validateBlueprint,
  ])

  useEffect(() => {}, [activeConnectionTab])

  useEffect(() => {
    setConfiguredConnection(
      blueprintConnections.length > 0 ? blueprintConnections[0] : null
    )
    const initializeEntities = (pV, cV) => ({ ...pV, [cV.id]: [] })
    const initializeProjects = (pV, cV) => ({ ...pV, [cV.id]: [] })
    const initializeBoards = (pV, cV) => ({ ...pV, [cV.id]: [] })
    setDataEntities((dE) => ({
      ...blueprintConnections.reduce(initializeEntities, {}),
    }))
    setProjects((p) => ({
      ...blueprintConnections.reduce(initializeProjects, {}),
    }))
    setBoards((b) => ({
      ...blueprintConnections.reduce(initializeBoards, {}),
    }))
    setEnabledProviders([
      ...new Set(blueprintConnections.map((c) => c.provider)),
    ])
  }, [blueprintConnections])

  useEffect(() => {
    console.log('>> CONFIGURING CONNECTION', configuredConnection)
    if (configuredConnection) {
      switch (configuredConnection.provider) {
        case Providers.GITLAB:
        case Providers.JIRA:
        case Providers.GITHUB:
          setDataEntitiesList(
            DEFAULT_DATA_ENTITIES.filter((d) => d.name !== 'ci-cd')
          )
          // setConfiguredProject(projects.length > 0 ? projects[0] : null)
          break
        case Providers.JENKINS:
          setDataEntitiesList(
            DEFAULT_DATA_ENTITIES.filter((d) => d.name == 'ci-cd')
          )
          break
        default:
          setDataEntitiesList(DEFAULT_DATA_ENTITIES)
          break
      }
    }
  }, [configuredConnection])

  useEffect(() => {
    console.log('>> DATA ENTITIES', dataEntities)
  }, [dataEntities])

  useEffect(() => {
    console.log('>> BOARDS', boards)
  }, [boards])

  useEffect(() => {
    setBlueprintSettings((currentSettings) => ({
      ...currentSettings,
      connections: blueprintConnections.map((c, cIdx) => ({
        ...NullBlueprintConnection,
        connectionId: c.value,
        plugin: c.plugin || c.provider,
        scope: createProviderScopes(
          c.provider,
          c,
          cIdx,
          dataEntities,
          boards,
          projects
        ),
      })),
    }))
  }, [blueprintConnections, dataEntities, boards, projects])

  useEffect(() => {
    setConfiguredProject(projects.length > 0 ? projects[0] : null)
  }, [projects])

  return (
    <>
      <div className='container'>
        <Nav />
        <Sidebar />
        <Content>
          <main className='main'>
            <div className='workflow-bar'>
              <ul className='workflow-steps'>
                <li
                  className={`workflow-step ${
                    activeStep?.id === 1 ? 'active' : ''
                  }`}
                >
                  <a href='#' className='step-id'>
                    1
                  </a>
                  Add Data Connections
                </li>
                <li
                  className={`workflow-step ${
                    activeStep?.id === 2 ? 'active' : ''
                  }`}
                >
                  <a href='#' className='step-id'>
                    2
                  </a>
                  Set Data Scope
                </li>
                <li
                  className={`workflow-step ${
                    activeStep?.id === 3 ? 'active' : ''
                  }`}
                >
                  <a href='#' className='step-id'>
                    3
                  </a>
                  Add Transformation (Optional)
                </li>
                <li
                  className={`workflow-step ${
                    activeStep?.id === 4 ? 'active' : ''
                  }`}
                >
                  <a href='#' className='step-id'>
                    4
                  </a>
                  Set Sync Frequency
                </li>
              </ul>
            </div>

            <div
              className={`workflow-content workflow-step-id-${activeStep?.id}`}
            >
              {activeStep?.id === 1 && (
                <div className='workflow-step workflow-step-data-connections'>
                  <Card
                    className='workflow-card'
                    elevation={Elevation.TWO}
                    style={{ width: '100%' }}
                  >
                    <h3>
                      Blueprint Name <span className='required-star'>*</span>
                    </h3>
                    <Divider className='section-divider' />
                    <p>
                      Give your Blueprint a unique name to help you identify it
                      in the future.
                    </p>
                    <InputGroup
                      id='blueprint-name'
                      placeholder='Enter Blueprint Name'
                      value={name}
                      onChange={(e) => setBlueprintName(e.target.value)}
                      className={`blueprint-name-input ${
                        fieldHasError('Blueprint Name') ? 'invalid-field' : ''
                      }`}
                      inline={true}
                      style={{ marginBottom: '10px' }}
                      rightElement={
                        <InputValidationError
                          error={getFieldError('Blueprint Name')}
                        />
                      }
                    />
                  </Card>

                  <Card
                    className='workflow-card'
                    elevation={Elevation.TWO}
                    style={{ width: '100%' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <h3 style={{ margin: 0 }}>
                        Add Data Connections{' '}
                        <span className='required-star'>*</span>
                      </h3>
                      <div>
                        <Button
                          text='Add Connection'
                          icon='plus'
                          intent={Intent.PRIMARY}
                          small
                          onClick={addConnection}
                        />
                      </div>
                    </div>
                    <Divider className='section-divider' />

                    <h4>Select Connections</h4>
                    <p>Select from existing or create new connections</p>

                    <ConnectionsSelector
                      items={connectionsList}
                      selectedItems={blueprintConnections}
                      onItemSelect={setBlueprintConnections}
                      onClear={setBlueprintConnections}
                      onRemove={setBlueprintConnections}
                      disabled={isSaving}
                    />
                    {blueprintConnections.length > 0 && (
                      <Card
                        className='selected-connections-list'
                        elevation={Elevation.ZERO}
                        style={{ padding: 0, marginTop: '10px' }}
                      >
                        {blueprintConnections.map((bC, bcIdx) => (
                          <div
                            className='connection-entry'
                            key={`connection-row-key-${bcIdx}`}
                            style={{
                              display: 'flex',
                              width: '100%',
                              height: '32px',
                              lineHeight: '100%',
                              justifyContent: 'space-between',
                              // margin: '8px 0',
                              padding: '8px 12px',
                              borderBottom: '1px solid #f0f0f0',
                            }}
                          >
                            <div>
                              <div
                                className='connection-name'
                                style={{ fontWeight: 600 }}
                              >
                                {bC.title}
                              </div>
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignContent: 'center',
                              }}
                            >
                              <div
                                className='connection-status'
                                style={{ textTransform: 'capitalize' }}
                              >
                                {bC.status}
                              </div>
                              <div
                                className='connection-actions'
                                style={{ paddingLeft: '20px' }}
                              >
                                <Button
                                  className='connection-action-settings'
                                  icon={
                                    <Icon
                                      icon='cog'
                                      size={12}
                                      color={Colors.BLUE4}
                                      onClick={() => manageConnection(bC)}
                                    />
                                  }
                                  color={Colors.BLUE3}
                                  small
                                  minimal
                                  style={{
                                    minWidth: '18px',
                                    minHeight: '18px',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </Card>
                    )}
                  </Card>
                </div>
              )}

              {activeStep?.id === 2 && (
                <div className='workflow-step workflow-step-data-scope'>
                  {blueprintConnections.length > 0 && (
                    <div style={{ display: 'flex' }}>
                      <div
                        className='connection-tab-selector'
                        style={{ minWidth: '200px' }}
                      >
                        <Card
                          className='workflow-card connection-tabs-card'
                          elevation={Elevation.TWO}
                          style={{ padding: '10px' }}
                        >
                          <ConnectionTabs
                            connections={blueprintConnections}
                            onChange={handleConnectionTabChange}
                            selectedTabId={activeConnectionTab}
                          />
                          {/*                         <Tabs
                          className='connection-tabs'
                          animate={true}
                          vertical={true}
                          id='connection-tabs'
                          onChange={(tabId) => handleConnectionTabChange(tabId)}
                          selectedTabId={activeConnectionTab}
                        >
                          {blueprintConnections.map((bC, bcIdx) => (
                            <Tab
                              key={`tab-key-${bcIdx}`}
                              id={`connection-${bC.id}`}
                              title={bC.title}
                              connection={bC}
                              // disabled={bC.disabled || bC.status !== 'online'}
                            />
                          ))}
                        </Tabs> */}
                        </Card>
                      </div>
                      <div
                        className='connection-scope'
                        style={{ marginLeft: '10px', width: '100%' }}
                      >
                        <Card
                          className='workflow-card worfklow-panel-card'
                          elevation={Elevation.TWO}
                        >
                          {configuredConnection && (
                            <>
                              <h3>
                                <span
                                  style={{ float: 'left', marginRight: '8px' }}
                                >
                                  {ProviderIcons[
                                    configuredConnection.provider
                                  ] ? (
                                    ProviderIcons[
                                      configuredConnection.provider
                                    ](24, 24)
                                  ) : (
                                    <></>
                                  )}
                                </span>{' '}
                                {configuredConnection.title}
                              </h3>
                              <Divider className='section-divider' />

                              {[Providers.GITLAB, Providers.GITHUB].includes(
                                configuredConnection.provider
                              ) && (
                                <>
                                  <h4>Projects *</h4>
                                  <p>
                                    Enter the projects you would like to sync.
                                  </p>
                                  <TagInput
                                    id='project-id'
                                    disabled={isRunning}
                                    placeholder={
                                      configuredConnection.provider ===
                                      Providers.GITHUB
                                        ? 'username/repo, username/another-repo'
                                        : '1000000, 200000'
                                    }
                                    values={
                                      projects[configuredConnection.id] || []
                                    }
                                    fill={true}
                                    onChange={(values) =>
                                      setProjects((p) => ({
                                        ...p,
                                        [configuredConnection.id]: [
                                          ...new Set(values),
                                        ],
                                      }))
                                    }
                                    addOnPaste={true}
                                    addOnBlur={true}
                                    rightElement={
                                      <Button
                                        disabled={isRunning}
                                        icon='eraser'
                                        minimal
                                        onClick={() =>
                                          setProjects((p) => ({
                                            ...p,
                                            [configuredConnection.id]: [],
                                          }))
                                        }
                                      />
                                    }
                                    onKeyDown={(e) =>
                                      e.key === 'Enter' && e.preventDefault()
                                    }
                                    tagProps={{
                                      intent: Intent.PRIMARY,
                                      minimal: true,
                                    }}
                                    className='input-project-id tagInput'
                                  />
                                </>
                              )}

                              {[Providers.JIRA].includes(
                                configuredConnection.provider
                              ) && (
                                <>
                                  <h4>Boards *</h4>
                                  <p>
                                    Select the boards you would like to sync.
                                  </p>
                                  <BoardsSelector
                                    items={boardsList}
                                    selectedItems={
                                      boards[configuredConnection.id] || []
                                    }
                                    onItemSelect={setBoards}
                                    onClear={setBoards}
                                    onRemove={setBoards}
                                    disabled={isSaving}
                                    configuredConnection={configuredConnection}
                                  />
                                </>
                              )}

                              <h4>Data Entities</h4>
                              <p>
                                Select the data entities you wish to collect for
                                the projects.{' '}
                                <a href='#'>Learn about data entities</a>
                              </p>
                              <DataEntitiesSelector
                                items={dataEntitiesList}
                                selectedItems={
                                  dataEntities[configuredConnection.id] || []
                                }
                                // restrictedItems={getRestrictedDataEntities()}
                                onItemSelect={setDataEntities}
                                onClear={setDataEntities}
                                onRemove={setDataEntities}
                                disabled={isSaving}
                                configuredConnection={configuredConnection}
                              />
                            </>
                          )}
                        </Card>
                      </div>
                    </div>
                  )}
                  {blueprintConnections.length === 0 && (
                    <NoData
                      title='No Data Connections'
                      message='Please select at least one connection source.'
                      onClick={prevStep}
                    />
                  )}
                </div>
              )}

              {activeStep?.id === 3 && (
                <div className='workflow-step workflow-step-add-transformation'>
                  <p
                    className='alert-neutral'
                    style={{
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '12px',
                      margin: '0 0 10px 0',
                      padding: '8px',
                      borderRadius: '6px',
                      color: '#3C5088',
                      backgroundColor: '#F0F4FE',
                      border: '1px solid #BDCEFB',
                    }}
                  >
                    Set transformation rules for your selected data to view more
                    complex metrics in the dashboards.
                    <br />
                    <a
                      href='#'
                      className='more-link'
                      rel='noreferrer'
                      style={{
                        color: '#7497F7',
                        marginTop: '5px',
                        display: 'inline-block',
                      }}
                    >
                      Find out more
                    </a>
                  </p>
                  {blueprintConnections.length > 0 && (
                    <div style={{ display: 'flex' }}>
                      <div
                        className='connection-tab-selector'
                        style={{ minWidth: '200px' }}
                      >
                        <Card
                          className='workflow-card connection-tabs-card'
                          elevation={Elevation.TWO}
                          style={{ padding: '10px' }}
                        >
                          <ConnectionTabs
                            connections={blueprintConnections}
                            onChange={handleConnectionTabChange}
                            selectedTabId={activeConnectionTab}
                          />
                        </Card>
                      </div>
                      <div
                        className='connection-transformation'
                        style={{ marginLeft: '10px', width: '100%' }}
                      >
                        <Card
                          className='workflow-card workflow-panel-card'
                          elevation={Elevation.TWO}
                        >
                          {configuredConnection && (
                            <>
                              <h3>
                                <span
                                  style={{ float: 'left', marginRight: '8px' }}
                                >
                                  {ProviderIcons[
                                    configuredConnection.provider
                                  ] ? (
                                    ProviderIcons[
                                      configuredConnection.provider
                                    ](24, 24)
                                  ) : (
                                    <></>
                                  )}
                                </span>{' '}
                                {configuredConnection.title}
                              </h3>
                              <Divider className='section-divider' />

                              {[Providers.GITLAB, Providers.GITHUB].includes(
                                configuredConnection.provider
                              ) && (
                                <>
                                  <StandardStackedList
                                    items={projects}
                                    className='selected-items-list selected-projects-list'
                                    connection={configuredConnection}
                                    activeItem={configuredProject}
                                    onAdd={addProjectTransformation}
                                    onChange={addProjectTransformation}
                                  />
                                  {projects[configuredConnection.id].length ===
                                    0 && (
                                    <NoData
                                      title='No Projects Selected'
                                      icon='git-branch'
                                      message='Please select specify at least one project.'
                                      onClick={prevStep}
                                    />
                                  )}
                                </>
                              )}

                              {[Providers.JIRA].includes(
                                configuredConnection.provider
                              ) && (
                                <>
                                  <StandardStackedList
                                    items={boards}
                                    className='selected-items-list selected-boards-list'
                                    connection={configuredConnection}
                                    activeItem={configuredBoard}
                                    onAdd={addBoardTransformation}
                                    onChange={addBoardTransformation}
                                  />
                                  {boards[configuredConnection.id].length ===
                                    0 && (
                                    <NoData
                                      title='No Boards Selected'
                                      icon='th'
                                      message='Please select specify at least one board.'
                                      onClick={prevStep}
                                    />
                                  )}
                                </>
                              )}

                              {configuredProject && (
                                <>
                                  <h4>Project</h4>
                                  <p>
                                    {configuredProject ||
                                      '< select a project >'}
                                  </p>
                                  <h4>Data Transformation Rules</h4>
                                  {!dataEntities[configuredConnection.id] ||
                                    (dataEntities[configuredConnection.id]
                                      ?.length === 0 && (
                                      <p>(No Data Entities Selected)</p>
                                    ))}
                                  {dataEntities[configuredConnection.id]?.find(
                                    (e) => e.value === DataEntityTypes.TICKET
                                  ) && (
                                    <>
                                      {renderProviderSettings(
                                        configuredConnection,
                                        configuredConnection.provider,
                                        integrationsData.find(
                                          (p) =>
                                            p.id ===
                                            configuredConnection.provider
                                        ),
                                        DataEntityTypes.TICKET
                                      )}
                                    </>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </Card>
                      </div>
                    </div>
                  )}
                  {blueprintConnections.length === 0 && (
                    <>
                      <div className='bp3-non-ideal-state'>
                        <div className='bp3-non-ideal-state-visual'>
                          <Icon icon='offline' size={32} />
                        </div>
                        <div className='bp3-non-ideal-state-text'>
                          <h4 className='bp3-heading' style={{ margin: 0 }}>
                            No Data Connections
                          </h4>
                          <div>
                            Please select at least one connection source.
                          </div>
                        </div>
                        <button
                          className='bp3-button bp4-intent-primary'
                          onClick={prevStep}
                        >
                          Go Back
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeStep?.id === 4 && (
                <div className='workflow-step workflow-step-set-sync-frequency'>
                  <Card className='workflow-card' elevation={Elevation.TWO}>
                    <h3 style={{ marginBottom: '8px' }}>Set Sync Frequency</h3>
                    {getCronPresetByConfig(cronConfig) ? (
                      <small
                        style={{
                          fontSize: '10px',
                          color: Colors.GRAY2,
                          display: 'block',
                        }}
                      >
                        <strong>Automated</strong> &mdash;{' '}
                        {getCronPresetByConfig(cronConfig).description}
                      </small>
                    ) : (
                      <small
                        style={{
                          fontSize: '10px',
                          color: Colors.GRAY2,
                          textTransform: 'uppercase',
                        }}
                      >
                        {cronConfig}
                      </small>
                    )}
                    <Divider className='section-divider' />

                    <h4>Frequency</h4>
                    <p>
                      Blueprints will run recurringly based on the sync
                      frequency.
                    </p>

                    <RadioGroup
                      inline={false}
                      label={false}
                      name='blueprint-frequency'
                      onChange={(e) => setCronConfig(e.target.value)}
                      selectedValue={cronConfig}
                      required
                    >
                      <Radio
                        label='Manual'
                        value='manual'
                        style={{
                          fontWeight:
                            cronConfig === 'manual' ? 'bold' : 'normal',
                        }}
                      />
                      {/* Dynamic Presets from Connection Manager */}
                      {[
                        getCronPreset('hourly'),
                        getCronPreset('daily'),
                        getCronPreset('weekly'),
                        getCronPreset('monthly'),
                      ].map((preset, prIdx) => (
                        <Radio
                          key={`cron-preset-tooltip-key${prIdx}`}
                          label={
                            <>
                              <Tooltip
                                position={Position.RIGHT}
                                intent={Intent.PRIMARY}
                                content={preset.description}
                              >
                                {preset.label}
                              </Tooltip>
                            </>
                          }
                          value={preset.cronConfig}
                          style={{
                            fontWeight:
                              cronConfig === preset.cronConfig
                                ? 'bold'
                                : 'normal',
                            outline: 'none !important',
                          }}
                        />
                      ))}
                      <Radio
                        label='Custom'
                        value='custom'
                        style={{
                          fontWeight:
                            cronConfig === 'custom' ? 'bold' : 'normal',
                        }}
                      />
                    </RadioGroup>
                    <div
                      style={{
                        display: cronConfig === 'custom' ? 'flex' : 'none',
                      }}
                    >
                      <FormGroup
                        disabled={cronConfig !== 'custom'}
                        label=''
                        inline={true}
                        labelFor='cron-custom'
                        className='formGroup-inline'
                        contentClassName='formGroupContent'
                        style={{ marginBottom: '5px' }}
                        fill={false}
                      >
                        <InputGroup
                          id='cron-custom'
                          inline={true}
                          fill={false}
                          readOnly={cronConfig !== 'custom'}
                          leftElement={
                            cronConfig !== 'custom' ? (
                              <Icon
                                icon='lock'
                                size={11}
                                style={{
                                  alignSelf: 'center',
                                  margin: '4px 10px -2px 6px',
                                }}
                              />
                            ) : null
                          }
                          rightElement={
                            <>
                              <InputValidationError
                                error={getFieldError('Blueprint Cron')}
                              />
                            </>
                          }
                          placeholder='Enter Crontab Syntax'
                          value={
                            cronConfig !== 'custom'
                              ? cronConfig
                              : customCronConfig
                          }
                          onChange={(e) => setCustomCronConfig(e.target.value)}
                          className={`cron-custom-input ${
                            fieldHasError('Blueprint Cron')
                              ? 'invalid-field'
                              : ''
                          }`}
                          inline={true}
                          fill={false}
                          style={{ transition: 'none' }}
                        />
                      </FormGroup>
                      <div
                        style={{
                          display: 'inline',
                          marginTop: 'auto',
                          paddingBottom: '15px',
                        }}
                      >
                        <Popover
                          className='trigger-crontab-help'
                          popoverClassName='popover-help-crontab'
                          position={Position.RIGHT}
                          autoFocus={false}
                          enforceFocus={false}
                          usePortal={false}
                        >
                          <a rel='noreferrer'>
                            <Icon
                              icon='help'
                              size={14}
                              style={{ marginLeft: '10px', transition: 'none' }}
                            />
                          </a>
                          <>
                            <div
                              style={{
                                textShadow: 'none',
                                fontSize: '12px',
                                padding: '12px',
                                maxWidth: '300px',
                              }}
                            >
                              <div
                                style={{
                                  marginBottom: '10px',
                                  fontWeight: 700,
                                  fontSize: '14px',
                                  fontFamily: '"Montserrat", sans-serif',
                                }}
                              >
                                <Icon
                                  icon='help'
                                  size={16}
                                  style={{ marginRight: '5px' }}
                                />{' '}
                                Cron Expression Format
                              </div>
                              <p>
                                Need Help? &mdash; For additional information on{' '}
                                <strong>Crontab</strong>, please reference the{' '}
                                <a
                                  href='https://man7.org/linux/man-pages/man5/crontab.5.html'
                                  rel='noreferrer'
                                  target='_blank'
                                  style={{ textDecoration: 'underline' }}
                                >
                                  Crontab Linux manual
                                </a>
                                .
                              </p>
                              <img
                                src={CronHelp}
                                style={{
                                  border: 0,
                                  margin: 0,
                                  maxWidth: '100%',
                                }}
                              />
                            </div>
                          </>
                        </Popover>
                      </div>
                    </div>

                    {cronConfig !== 'manual' && (
                      <div>
                        <Divider
                          className='section-divider'
                          style={{ marginTop: ' 20px' }}
                        />
                        <div>
                          <Button
                            text='View Schedule'
                            icon='time'
                            intent={Intent.NONE}
                            small
                            style={{ float: 'right', fontSize: '11px' }}
                          />

                          <h4 style={{ marginRight: 0, marginBottom: 0 }}>
                            Next Run Date
                          </h4>
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 800 }}>
                          {dayjs(
                            createCron(
                              cronConfig === 'custom'
                                ? customCronConfig
                                : cronConfig
                            )
                              .next()
                              .toString()
                          ).format('L LTS')}{' '}
                          &middot;{' '}
                          <span style={{ color: Colors.GRAY3 }}>
                            (
                            {dayjs(
                              createCron(
                                cronConfig === 'custom'
                                  ? customCronConfig
                                  : cronConfig
                              )
                                .next()
                                .toString()
                            ).fromNow()}
                            )
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>

            <div className='workflow-actions'>
              <Button
                intent={Intent.PRIMARY}
                text='Previous Step'
                onClick={prevStep}
                disabled={activeStep?.id === 1}
              />

              {activeStep?.id === 4 ? (
                <div style={{ marginLeft: 'auto' }}>
                  <Button
                    intent={Intent.PRIMARY}
                    text='Save Blueprint'
                    disabled
                    // onClick={saveBlueprint}
                  />
                  <Button
                    intent={Intent.DANGER}
                    text='Save and Run Now'
                    style={{ marginLeft: '5px' }}
                    disabled
                    // onClick={saveBlueprintAndRunPipeline}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', marginLeft: 'auto' }}>
                  <Button
                    intent={Intent.PRIMARY}
                    icon='code'
                    text='Inspect'
                    onClick={() => setShowBlueprintInspector(true)}
                    style={{ marginRight: '8px' }}
                    minimal
                    small
                  />
                  <Button
                    intent={Intent.PRIMARY}
                    text='Next Step'
                    onClick={nextStep}
                  />
                </div>
              )}
            </div>
          </main>
        </Content>
      </div>
      <ConnectionDialog
        connection={managedConnection}
        errors={connectionErrors}
        endpointUrl={endpointUrl}
        name={connectionName}
        proxy={proxy}
        token={token}
        username={username}
        password={password}
        isOpen={connectionDialogIsOpen}
        isTesting={isTestingConnection}
        isSaving={isSavingConnection}
        isValid={isValidConnection}
        onClose={handleConnectionDialogClose}
        onOpen={handleConnectionDialogOpen}
        onTest={testConnection}
        onSave={saveConnection}
        onValidate={validateConnection}
        onNameChange={setName}
        onEndpointChange={setEndpointUrl}
        onProxyChange={setProxy}
        onTokenChange={setToken}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
      />

      <CodeInspector
        title={name}
        titleIcon='add'
        subtitle='JSON CONFIGURATION'
        isOpen={showBlueprintInspector}
        activePipeline={{
          ID: 0,
          name,
          tasks: blueprintTasks,
          settings: blueprintSettings,
          cronConfig,
          enable,
        }}
        onClose={setShowBlueprintInspector}
        hasBackdrop={false}
      />
    </>
  )
}

export default CreateBlueprint
