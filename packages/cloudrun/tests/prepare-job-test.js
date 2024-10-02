"use strict";
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
var fs = __importStar(require("fs"));
var path = __importStar(require("path"));
var hooks_1 = require("../src/hooks");
var prepare_job_1 = require("../src/hooks/prepare-job");
var test_setup_1 = require("./test-setup");
var utils_1 = require("../src/k8s/utils");
var k8s_1 = require("../src/k8s");
var constants_1 = require("../src/hooks/constants");
jest.useRealTimers();
var testHelper;
var prepareJobData;
var prepareJobOutputFilePath;
describe('Prepare job', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    testHelper = new test_setup_1.TestHelper();
                    return [4 /*yield*/, testHelper.initialize()];
                case 1:
                    _a.sent();
                    prepareJobData = testHelper.getPrepareJobDefinition();
                    prepareJobOutputFilePath = testHelper.createFile('prepare-job-output.json');
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
    it('should not throw exception', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expect((0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)).resolves.not.toThrow()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should generate output file in JSON format', function () { return __awaiter(void 0, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)];
                case 1:
                    _a.sent();
                    content = fs.readFileSync(prepareJobOutputFilePath);
                    expect(function () { return JSON.parse(content.toString()); }).not.toThrow();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should prepare job with absolute path for userVolumeMount', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prepareJobData.args.container.userMountVolumes = [
                        {
                            sourceVolumePath: path.join(process.env.GITHUB_WORKSPACE, '/myvolume'),
                            targetVolumePath: '/volume_mount',
                            readOnly: false
                        }
                    ];
                    return [4 /*yield*/, expect((0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)).resolves.not.toThrow()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should throw an exception if the user volume mount is absolute path outside of GITHUB_WORKSPACE', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prepareJobData.args.container.userMountVolumes = [
                        {
                            sourceVolumePath: '/somewhere/not/in/gh-workspace',
                            targetVolumePath: '/containermount',
                            readOnly: false
                        }
                    ];
                    return [4 /*yield*/, expect((0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)).rejects.toThrow()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should not run prepare job without the job container', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prepareJobData.args.container = undefined;
                    return [4 /*yield*/, expect((0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)).rejects.toThrow()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('should not set command + args for service container if not passed in args', function () { return __awaiter(void 0, void 0, void 0, function () {
        var services;
        return __generator(this, function (_a) {
            services = prepareJobData.args.services.map(function (service) {
                return (0, prepare_job_1.createContainerSpec)(service, (0, utils_1.generateContainerName)(service.image));
            });
            expect(services[0].command).toBe(undefined);
            expect(services[0].args).toBe(undefined);
            return [2 /*return*/];
        });
    }); });
    it('should determine alpine correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prepareJobData.args.container.image = 'alpine:latest';
                    return [4 /*yield*/, (0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)];
                case 1:
                    _a.sent();
                    content = JSON.parse(fs.readFileSync(prepareJobOutputFilePath).toString());
                    expect(content.isAlpine).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should run pod with extensions applied', function () { return __awaiter(void 0, void 0, void 0, function () {
        var content, got;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
        return __generator(this, function (_x) {
            switch (_x.label) {
                case 0:
                    process.env[utils_1.ENV_HOOK_TEMPLATE_PATH] = path.join(__dirname, '../../../examples/extension.yaml');
                    return [4 /*yield*/, expect((0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)).resolves.not.toThrow()];
                case 1:
                    _x.sent();
                    delete process.env[utils_1.ENV_HOOK_TEMPLATE_PATH];
                    content = JSON.parse(fs.readFileSync(prepareJobOutputFilePath).toString());
                    return [4 /*yield*/, (0, k8s_1.getPodByName)(content.state.jobPod)];
                case 2:
                    got = _x.sent();
                    expect((_b = (_a = got.metadata) === null || _a === void 0 ? void 0 : _a.annotations) === null || _b === void 0 ? void 0 : _b['annotated-by']).toBe('extension');
                    expect((_d = (_c = got.metadata) === null || _c === void 0 ? void 0 : _c.labels) === null || _d === void 0 ? void 0 : _d['labeled-by']).toBe('extension');
                    expect((_f = (_e = got.spec) === null || _e === void 0 ? void 0 : _e.securityContext) === null || _f === void 0 ? void 0 : _f.runAsUser).toBe(1000);
                    expect((_h = (_g = got.spec) === null || _g === void 0 ? void 0 : _g.securityContext) === null || _h === void 0 ? void 0 : _h.runAsGroup).toBe(3000);
                    // job container
                    expect((_j = got.spec) === null || _j === void 0 ? void 0 : _j.containers[0].name).toBe(constants_1.JOB_CONTAINER_NAME);
                    expect((_k = got.spec) === null || _k === void 0 ? void 0 : _k.containers[0].image).toBe('node:14.16');
                    expect((_l = got.spec) === null || _l === void 0 ? void 0 : _l.containers[0].command).toEqual(['sh']);
                    expect((_m = got.spec) === null || _m === void 0 ? void 0 : _m.containers[0].args).toEqual(['-c', 'sleep 50']);
                    // service container
                    expect((_o = got.spec) === null || _o === void 0 ? void 0 : _o.containers[1].image).toBe('redis');
                    expect((_p = got.spec) === null || _p === void 0 ? void 0 : _p.containers[1].command).toBeFalsy();
                    expect((_q = got.spec) === null || _q === void 0 ? void 0 : _q.containers[1].args).toBeFalsy();
                    expect((_r = got.spec) === null || _r === void 0 ? void 0 : _r.containers[1].env).toEqual([
                        { name: 'ENV2', value: 'value2' }
                    ]);
                    expect((_s = got.spec) === null || _s === void 0 ? void 0 : _s.containers[1].resources).toEqual({
                        requests: { memory: '1Mi', cpu: '1' },
                        limits: { memory: '1Gi', cpu: '2' }
                    });
                    // side-car
                    expect((_t = got.spec) === null || _t === void 0 ? void 0 : _t.containers[2].name).toBe('side-car');
                    expect((_u = got.spec) === null || _u === void 0 ? void 0 : _u.containers[2].image).toBe('ubuntu:latest');
                    expect((_v = got.spec) === null || _v === void 0 ? void 0 : _v.containers[2].command).toEqual(['sh']);
                    expect((_w = got.spec) === null || _w === void 0 ? void 0 : _w.containers[2].args).toEqual(['-c', 'sleep 60']);
                    return [2 /*return*/];
            }
        });
    }); });
    it('should not throw exception using kube scheduler', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // only for ReadWriteMany volumes or single node cluster
                    process.env[utils_1.ENV_USE_KUBE_SCHEDULER] = 'true';
                    return [4 /*yield*/, expect((0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)).resolves.not.toThrow()];
                case 1:
                    _a.sent();
                    delete process.env[utils_1.ENV_USE_KUBE_SCHEDULER];
                    return [2 /*return*/];
            }
        });
    }); });
    test.each([undefined, null, []])('should not throw exception when portMapping=%p', function (pm) { return __awaiter(void 0, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    prepareJobData.args.services.forEach(function (s) {
                        s.portMappings = pm;
                    });
                    return [4 /*yield*/, (0, prepare_job_1.prepareJob)(prepareJobData.args, prepareJobOutputFilePath)];
                case 1:
                    _a.sent();
                    content = JSON.parse(fs.readFileSync(prepareJobOutputFilePath).toString());
                    expect(function () { return content.context.services[0].image; }).not.toThrow();
                    return [2 /*return*/];
            }
        });
    }); });
});
