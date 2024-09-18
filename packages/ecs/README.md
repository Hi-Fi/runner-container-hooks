# AWS Elastic Container Service (ECS) Hooks

## Description
This implementation provides a way to dynamically spin up jobs to run container workflows, rather then relying on the default docker implementation. It is meant to be used when the runner itself is running in Azure Container App, for example when using the PoC from [gha-runners-on-managed-env](https://github.com/Hi-Fi/gha-runners-on-managed-env)

## Pre-requisites 
Some things are expected to be set when using these hooks
- The runner itself should be running in a task, with a role enought permissions to
    - Create and remove task definitions
    - Create, list and remove tasks
- The `AWS_REGION` env should be set to used AWS region
- The `ECS_CLUSTER_NAME` env should be set to ECS cluster where tasks are created
- The `ECS_EXECUTION_ROLE` env should be set to ECS Execution role used in tasks
- The `ECS_TASK_ROLE` env should be set to ECS task role used in tasks
- The `ECS_SUBNETS` env should be set to subnet(s) task should utilize
- The `ECS_SECURITY_GROUPS` env should be set to securoty group(s) task should utilize
- The `EFS_ID` env should be set to ID of the Elastic File Service (EFS) which is used for shared storage between tasks
- The `EXTERNALS_EFS_ID` env should be set to ID of the Elastic File Service (EFS) which is used for external binaries coming from runner image (e.g. Node16, Node20 etc.)
- The `EXECID` env should be set to random execution ID used by specific job. Has to be universally unique to prevent jobs to mix their sources
- Some actions runner env's are expected to be set. These are set automatically by the runner.
    - `RUNNER_WORKSPACE` is expected to be set to the workspace of the runner
    - `GITHUB_WORKSPACE` is expected to be set to the workspace of the job


## Limitations
- A [job containers](https://docs.github.com/en/actions/using-jobs/running-jobs-in-a-container) will be required for all jobs
- Building container actions from a dockerfile is not supported at this time
- Container actions will not have access to the services network or job container network
- Docker [create options](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idcontaineroptions) are not supported
