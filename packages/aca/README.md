# Azure Container App (ACA) Hooks

## Description
This implementation provides a way to dynamically spin up jobs to run container workflows, rather then relying on the default docker implementation. It is meant to be used when the runner itself is running in Azure Container App, for example when using the PoC from [gha-runners-on-managed-env](https://github.com/Hi-Fi/gha-runners-on-managed-env)

## Pre-requisites 
Some things are expected to be set when using these hooks
- The runner itself should be running in a Container App job, with identity enough permissions to
    - Start new Container App jobs
    - Delete exiting jobs
    - Add tags to created jobs
    - List current jobs
- The `SUBSCRIPTION_ID` env should be set to subscription containing current subscription
- The `RG_NAME` env should be set to resource group name where jobs are created to
- The `ACA_ENVIRONMENT_ID` env should be set to used Azure Container Apps environment's resource ID.
- The `STORAGE_NAME` env should be set to name od storage created in ACA environment that's used for job specific sources
- The `EXTERNAL_STORAGE_NAME` env should be set to name of storage created in ACA environment that's used for external binaries coming from runner image (e.g. Node16, Node20 etc.)
- The `EXECID` env should be set to random execution ID used by specific job. Has to be universally unique to prevent jobs to mix their sources
- Some actions runner env's are expected to be set. These are set automatically by the runner.
    - `RUNNER_WORKSPACE` is expected to be set to the workspace of the runner
    - `GITHUB_WORKSPACE` is expected to be set to the workspace of the job

## Limitations
- A [job containers](https://docs.github.com/en/actions/using-jobs/running-jobs-in-a-container) will be required for all jobs
- Building container actions from a dockerfile is not supported at this time
- Container actions will not have access to the services network or job container network
- Docker [create options](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idcontaineroptions) are not supported
