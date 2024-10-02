"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var hooks_1 = require("../src/hooks");
var test_setup_1 = require("./test-setup");
var exec = __importStar(require("../src/ecs/index"));
var utils = __importStar(require("../src/ecs/utils"));
var fs_1 = require("fs");
jest.mock("fs", function () { return (__assign(__assign({ promises: __assign({}, jest.requireActual("fs").promises), constants: __assign({}, jest.requireActual("fs").constanst) }, jest.requireActual("fs")), { rmSync: jest.fn() })); });
jest.useRealTimers();
var testHelper;
var prepareJobOutputData;
var runScriptStepDefinition;
var spyExec = function (returnCode) {
    var response = "\nFirst line\nsecond line\nSCRIPT_RUN_STATUS: ".concat(returnCode, "\n");
    jest.spyOn(exec, 'execTaskStep').mockResolvedValue(response);
    jest.spyOn(utils, 'writeEntryPointScript').mockReturnValue({
        containerPath: 'containerPath',
        runnerPath: 'runnerPath'
    });
};
afterEach(function () {
    jest.clearAllMocks();
});
describe('Run script step', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var prepareJobOutputFilePath, prepareJobData, outputContent;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    testHelper = new test_setup_1.TestHelper();
                    return [4 /*yield*/, testHelper.initialize()];
                case 1:
                    _a.sent();
                    prepareJobOutputFilePath = testHelper.createFile('prepare-job-output.json');
                    prepareJobData = testHelper.getPrepareJobDefinition();
                    runScriptStepDefinition = testHelper.getRunScriptStepDefinition();
                    return [4 /*yield*/, (0, hooks_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)];
                case 2:
                    _a.sent();
                    outputContent = (0, fs_1.readFileSync)(prepareJobOutputFilePath);
                    prepareJobOutputData = JSON.parse(outputContent.toString());
                    return [2 /*return*/];
            }
        });
    }); });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, hooks_1.cleanupJob)()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, testHelper.cleanup()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // NOTE: To use this test, do kubectl apply -f podspec.yaml (from podspec examples)
    // then change the name of the file to 'run-script-step-test.ts' and do
    // npm run test run-script-step
    it('should not throw an exception', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    spyExec(0);
                    return [4 /*yield*/, expect((0, hooks_1.runScriptStep)({}, { jobPod: 'test' }, null)).resolves.not.toThrow()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should throw an exception if command fails', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    spyExec(2);
                    return [4 /*yield*/, expect((0, hooks_1.runScriptStep)({}, { jobPod: 'test' }, null)).rejects.toThrow()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // it('should fail if the working directory does not exist', async () => {
    //   runScriptStepDefinition.args.workingDirectory = '/foo/bar'
    //   await expect(
    //     runScriptStep(
    //       runScriptStepDefinition.args,
    //       prepareJobOutputData.state,
    //       null
    //     )
    //   ).rejects.toThrow()
    // })
    // it('should shold have env variables available', async () => {
    //   runScriptStepDefinition.args.entryPoint = 'bash'
    //   runScriptStepDefinition.args.entryPointArgs = [
    //     '-c',
    //     "'if [[ -z $NODE_ENV ]]; then exit 1; fi'"
    //   ]
    //   await expect(
    //     runScriptStep(
    //       runScriptStepDefinition.args,
    //       prepareJobOutputData.state,
    //       null
    //     )
    //   ).resolves.not.toThrow()
    // })
    // it('Should have path variable changed in container with prepend path string', async () => {
    //   runScriptStepDefinition.args.prependPath = '/some/path'
    //   runScriptStepDefinition.args.entryPoint = '/bin/bash'
    //   runScriptStepDefinition.args.entryPointArgs = [
    //     '-c',
    //     `'if [[ ! $(env | grep "^PATH=") = "PATH=${runScriptStepDefinition.args.prependPath}:"* ]]; then exit 1; fi'`
    //   ]
    //   await expect(
    //     runScriptStep(
    //       runScriptStepDefinition.args,
    //       prepareJobOutputData.state,
    //       null
    //     )
    //   ).resolves.not.toThrow()
    // })
    // it('Dollar symbols in environment variables should not be expanded', async () => {
    //   runScriptStepDefinition.args.environmentVariables = {
    //     VARIABLE1: '$VAR',
    //     VARIABLE2: '${VAR}',
    //     VARIABLE3: '$(VAR)'
    //   }
    //   runScriptStepDefinition.args.entryPointArgs = [
    //     '-c',
    //     '\'if [[ -z "$VARIABLE1" ]]; then exit 1; fi\'',
    //     '\'if [[ -z "$VARIABLE2" ]]; then exit 2; fi\'',
    //     '\'if [[ -z "$VARIABLE3" ]]; then exit 3; fi\''
    //   ]
    //   await expect(
    //     runScriptStep(
    //       runScriptStepDefinition.args,
    //       prepareJobOutputData.state,
    //       null
    //     )
    //   ).resolves.not.toThrow()
    // })
    // it('Should have path variable changed in container with prepend path string array', async () => {
    //   runScriptStepDefinition.args.prependPath = ['/some/other/path']
    //   runScriptStepDefinition.args.entryPoint = '/bin/bash'
    //   runScriptStepDefinition.args.entryPointArgs = [
    //     '-c',
    //     `'if [[ ! $(env | grep "^PATH=") = "PATH=${runScriptStepDefinition.args.prependPath.join(
    //       ':'
    //     )}:"* ]]; then exit 1; fi'`
    //   ]
    //   await expect(
    //     runScriptStep(
    //       runScriptStepDefinition.args,
    //       prepareJobOutputData.state,
    //       null
    //     )
    //   ).resolves.not.toThrow()
    // })
});
