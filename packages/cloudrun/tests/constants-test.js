"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var constants_1 = require("../src/hooks/constants");
describe('constants', function () {
    describe('runner instance label', function () {
        beforeEach(function () {
            process.env.ACTIONS_RUNNER_POD_NAME = 'example';
        });
        it('should throw if ACTIONS_RUNNER_POD_NAME env is not set', function () {
            delete process.env.ACTIONS_RUNNER_POD_NAME;
            expect(function () { return new constants_1.RunnerInstanceLabel(); }).toThrow();
        });
        it('should have key truthy', function () {
            var runnerInstanceLabel = new constants_1.RunnerInstanceLabel();
            expect(typeof runnerInstanceLabel.key).toBe('string');
            expect(runnerInstanceLabel.key).toBeTruthy();
            expect(runnerInstanceLabel.key.length).toBeGreaterThan(0);
        });
        it('should have value as runner pod name', function () {
            var name = process.env.ACTIONS_RUNNER_POD_NAME;
            var runnerInstanceLabel = new constants_1.RunnerInstanceLabel();
            expect(typeof runnerInstanceLabel.value).toBe('string');
            expect(runnerInstanceLabel.value).toBe(name);
        });
        it('should have toString combination of key and value', function () {
            var runnerInstanceLabel = new constants_1.RunnerInstanceLabel();
            expect(runnerInstanceLabel.toString()).toBe("".concat(runnerInstanceLabel.key, "=").concat(runnerInstanceLabel.value));
        });
    });
    describe('getRunnerPodName', function () {
        it('should throw if ACTIONS_RUNNER_POD_NAME env is not set', function () {
            delete process.env.ACTIONS_RUNNER_POD_NAME;
            expect(function () { return (0, constants_1.getRunnerPodName)(); }).toThrow();
            process.env.ACTIONS_RUNNER_POD_NAME = '';
            expect(function () { return (0, constants_1.getRunnerPodName)(); }).toThrow();
        });
        it('should return corrent ACTIONS_RUNNER_POD_NAME name', function () {
            var name = 'example';
            process.env.ACTIONS_RUNNER_POD_NAME = name;
            expect((0, constants_1.getRunnerPodName)()).toBe(name);
        });
    });
    describe('getJobPodName', function () {
        it('should throw on getJobPodName if ACTIONS_RUNNER_POD_NAME env is not set', function () {
            delete process.env.ACTIONS_RUNNER_POD_NAME;
            expect(function () { return (0, constants_1.getJobPodName)(); }).toThrow();
            process.env.ACTIONS_RUNNER_POD_NAME = '';
            expect(function () { return (0, constants_1.getRunnerPodName)(); }).toThrow();
        });
        it('should contain suffix -workflow', function () {
            var tableTests = [
                {
                    podName: 'test',
                    expect: 'test-workflow'
                },
                {
                    // podName.length == 63
                    podName: 'abcdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
                    expect: 'abcdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-workflow'
                }
            ];
            for (var _i = 0, tableTests_1 = tableTests; _i < tableTests_1.length; _i++) {
                var tt = tableTests_1[_i];
                process.env.ACTIONS_RUNNER_POD_NAME = tt.podName;
                var actual = (0, constants_1.getJobPodName)();
                expect(actual).toBe(tt.expect);
            }
        });
    });
    describe('getVolumeClaimName', function () {
        it('should throw if ACTIONS_RUNNER_POD_NAME env is not set', function () {
            delete process.env.ACTIONS_RUNNER_CLAIM_NAME;
            delete process.env.ACTIONS_RUNNER_POD_NAME;
            expect(function () { return (0, constants_1.getVolumeClaimName)(); }).toThrow();
            process.env.ACTIONS_RUNNER_POD_NAME = '';
            expect(function () { return (0, constants_1.getVolumeClaimName)(); }).toThrow();
        });
        it('should return ACTIONS_RUNNER_CLAIM_NAME env if set', function () {
            var claimName = 'testclaim';
            process.env.ACTIONS_RUNNER_CLAIM_NAME = claimName;
            process.env.ACTIONS_RUNNER_POD_NAME = 'example';
            expect((0, constants_1.getVolumeClaimName)()).toBe(claimName);
        });
        it('should contain suffix -work if ACTIONS_RUNNER_CLAIM_NAME is not set', function () {
            delete process.env.ACTIONS_RUNNER_CLAIM_NAME;
            process.env.ACTIONS_RUNNER_POD_NAME = 'example';
            expect((0, constants_1.getVolumeClaimName)()).toBe('example-work');
        });
    });
    describe('getSecretName', function () {
        it('should throw if ACTIONS_RUNNER_POD_NAME env is not set', function () {
            delete process.env.ACTIONS_RUNNER_POD_NAME;
            expect(function () { return (0, constants_1.getSecretName)(); }).toThrow();
            process.env.ACTIONS_RUNNER_POD_NAME = '';
            expect(function () { return (0, constants_1.getSecretName)(); }).toThrow();
        });
        it('should contain suffix -secret- and name trimmed', function () {
            var podNames = [
                'test',
                'abcdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
            ];
            for (var _i = 0, podNames_1 = podNames; _i < podNames_1.length; _i++) {
                var podName = podNames_1[_i];
                process.env.ACTIONS_RUNNER_POD_NAME = podName;
                var actual = (0, constants_1.getSecretName)();
                var re = new RegExp("".concat(podName.substring(constants_1.MAX_POD_NAME_LENGTH -
                    '-secret-'.length -
                    constants_1.STEP_POD_NAME_SUFFIX_LENGTH), "-secret-[a-z0-9]{8,}"));
                expect(actual).toMatch(re);
            }
        });
    });
    describe('getStepPodName', function () {
        it('should throw if ACTIONS_RUNNER_POD_NAME env is not set', function () {
            delete process.env.ACTIONS_RUNNER_POD_NAME;
            expect(function () { return (0, constants_1.getStepPodName)(); }).toThrow();
            process.env.ACTIONS_RUNNER_POD_NAME = '';
            expect(function () { return (0, constants_1.getStepPodName)(); }).toThrow();
        });
        it('should contain suffix -step- and name trimmed', function () {
            var podNames = [
                'test',
                'abcdaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
            ];
            for (var _i = 0, podNames_2 = podNames; _i < podNames_2.length; _i++) {
                var podName = podNames_2[_i];
                process.env.ACTIONS_RUNNER_POD_NAME = podName;
                var actual = (0, constants_1.getStepPodName)();
                var re = new RegExp("".concat(podName.substring(constants_1.MAX_POD_NAME_LENGTH - '-step-'.length - constants_1.STEP_POD_NAME_SUFFIX_LENGTH), "-step-[a-z0-9]{8,}"));
                expect(actual).toMatch(re);
            }
        });
    });
    describe('const values', function () {
        it('should have constants set', function () {
            expect(constants_1.JOB_CONTAINER_NAME).toBeTruthy();
            expect(constants_1.MAX_POD_NAME_LENGTH).toBeGreaterThan(0);
            expect(constants_1.STEP_POD_NAME_SUFFIX_LENGTH).toBeGreaterThan(0);
        });
    });
});
