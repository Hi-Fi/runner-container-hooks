import * as core from '@actions/core'
import TailFile from '@logdna/tail-file';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';
import { setInterval } from 'timers';

/**
 * 
 * @param jobId ID of job (name of the job file without .sh)
 * @returns Return code of the commend from shell. 0 is OK and any other means error
 */
export async function waitForJobCompletion(jobId: string): Promise<string> {
    if (!process.env.RUNNER_TEMP) {
        throw new Error('Environment variable RUNNER_TEMP not set, path to follow unknown');
    }
    const logFile = join(process.env.RUNNER_TEMP, `${jobId}.sh.log`);
    const waitedFile = join(process.env.RUNNER_TEMP, `${jobId}.sh.rc`);

    core.debug(`Waiting for job ${jobId} log file (waiting for file ${logFile})`)
    await new Promise<void>(resolve => {
        setInterval(() => {
            if (existsSync(logFile)) {
                resolve()
            }
        }, 100)
    });
    const tailer = new TailFile(logFile, {
        encoding: 'utf-8',
        pollFailureRetryMs: 500,
        maxPollFailures: 20,
        startPos: 0
    });

    await tailer.start()
    const printer = createInterface({
        input: tailer
    });
    printer.on('line', line => {
        // Using normal console printing as lines should already contain level information
        console.log(line)
    })

    core.debug(`Waiting for job ${jobId} to complete (waiting for file ${waitedFile})`)

    return new Promise(resolve => {
        setInterval(async () => {
            if (existsSync(waitedFile)) {
                core.debug(`Job ${jobId} completed (file ${waitedFile} exists)`)
                await tailer.quit()
                resolve(readFileSync(waitedFile, { encoding: 'utf-8' }))
            }
        }, 2000)
    })
}
