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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = __importStar(require("fs"));
var k8s_1 = require("../src/k8s");
var utils_1 = require("../src/k8s/utils");
var test_setup_1 = require("./test-setup");
var testHelper;
describe('k8s utils', function () {
    describe('write entrypoint', function () {
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testHelper = new test_setup_1.TestHelper();
                        return [4 /*yield*/, testHelper.initialize()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testHelper.cleanup()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should not throw', function () {
            expect(function () {
                return (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                    SOME_ENV: 'SOME_VALUE'
                });
            }).not.toThrow();
        });
        it('should throw if RUNNER_TEMP is not set', function () {
            delete process.env.RUNNER_TEMP;
            expect(function () {
                return (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                    SOME_ENV: 'SOME_VALUE'
                });
            }).toThrow();
        });
        it('should throw if environment variable name contains double quote', function () {
            expect(function () {
                return (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                    'SOME"_ENV': 'SOME_VALUE'
                });
            }).toThrow();
        });
        it('should throw if environment variable name contains =', function () {
            expect(function () {
                return (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                    'SOME=ENV': 'SOME_VALUE'
                });
            }).toThrow();
        });
        it('should throw if environment variable name contains single quote', function () {
            expect(function () {
                return (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                    "SOME'_ENV": 'SOME_VALUE'
                });
            }).toThrow();
        });
        it('should throw if environment variable name contains dollar', function () {
            expect(function () {
                return (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                    SOME_$_ENV: 'SOME_VALUE'
                });
            }).toThrow();
        });
        it('should escape double quote, dollar and backslash in environment variable values', function () {
            var runnerPath = (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                DQUOTE: '"',
                BACK_SLASH: '\\',
                DOLLAR: '$'
            }).runnerPath;
            expect(fs.existsSync(runnerPath)).toBe(true);
            var script = fs.readFileSync(runnerPath, 'utf8');
            expect(script).toContain('"DQUOTE=\\"');
            expect(script).toContain('"BACK_SLASH=\\\\"');
            expect(script).toContain('"DOLLAR=\\$"');
        });
        it('should return object with containerPath and runnerPath', function () {
            var _a = (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                SOME_ENV: 'SOME_VALUE'
            }), containerPath = _a.containerPath, runnerPath = _a.runnerPath;
            expect(containerPath).toMatch(/\/__w\/_temp\/.*\.sh/);
            var re = new RegExp("".concat(process.env.RUNNER_TEMP, "/.*\\.sh"));
            expect(runnerPath).toMatch(re);
        });
        it('should write entrypoint path and the file should exist', function () {
            var runnerPath = (0, utils_1.writeEntryPointScript)('/test', 'sh', ['-e', 'script.sh'], ['/prepend/path'], {
                SOME_ENV: 'SOME_VALUE'
            }).runnerPath;
            expect(fs.existsSync(runnerPath)).toBe(true);
        });
    });
    describe('container volumes', function () {
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testHelper = new test_setup_1.TestHelper();
                        return [4 /*yield*/, testHelper.initialize()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testHelper.cleanup()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw if container action and GITHUB_WORKSPACE env is not set', function () {
            delete process.env.GITHUB_WORKSPACE;
            expect(function () { return (0, utils_1.containerVolumes)([], true, true); }).toThrow();
            expect(function () { return (0, utils_1.containerVolumes)([], false, true); }).toThrow();
        });
        it('should always have work mount', function () {
            var volumes = (0, utils_1.containerVolumes)([], true, true);
            expect(volumes.find(function (e) { return e.mountPath === '/__w'; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], true, false);
            expect(volumes.find(function (e) { return e.mountPath === '/__w'; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], false, true);
            expect(volumes.find(function (e) { return e.mountPath === '/__w'; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], false, false);
            expect(volumes.find(function (e) { return e.mountPath === '/__w'; })).toBeTruthy();
        });
        it('should always have /github/workflow mount if working on container job or container action', function () {
            var volumes = (0, utils_1.containerVolumes)([], true, true);
            expect(volumes.find(function (e) { return e.mountPath === '/github/workflow'; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], true, false);
            expect(volumes.find(function (e) { return e.mountPath === '/github/workflow'; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], false, true);
            expect(volumes.find(function (e) { return e.mountPath === '/github/workflow'; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], false, false);
            expect(volumes.find(function (e) { return e.mountPath === '/github/workflow'; })).toBeUndefined();
        });
        it('should have container action volumes', function () {
            var volumes = (0, utils_1.containerVolumes)([], true, true);
            var workspace = volumes.find(function (e) { return e.mountPath === '/github/workspace'; });
            var fileCommands = volumes.find(function (e) { return e.mountPath === '/github/file_commands'; });
            expect(workspace).toBeTruthy();
            expect(workspace === null || workspace === void 0 ? void 0 : workspace.subPath).toBe('repo/repo');
            expect(fileCommands).toBeTruthy();
            expect(fileCommands === null || fileCommands === void 0 ? void 0 : fileCommands.subPath).toBe('_temp/_runner_file_commands');
            volumes = (0, utils_1.containerVolumes)([], false, true);
            workspace = volumes.find(function (e) { return e.mountPath === '/github/workspace'; });
            fileCommands = volumes.find(function (e) { return e.mountPath === '/github/file_commands'; });
            expect(workspace).toBeTruthy();
            expect(workspace === null || workspace === void 0 ? void 0 : workspace.subPath).toBe('repo/repo');
            expect(fileCommands).toBeTruthy();
            expect(fileCommands === null || fileCommands === void 0 ? void 0 : fileCommands.subPath).toBe('_temp/_runner_file_commands');
        });
        it('should have externals, github home mounts if job container', function () {
            var volumes = (0, utils_1.containerVolumes)();
            expect(volumes.find(function (e) { return e.mountPath === '/__e'; })).toBeTruthy();
            expect(volumes.find(function (e) { return e.mountPath === '/github/home'; })).toBeTruthy();
        });
        it('should throw if user volume source volume path is not in workspace', function () {
            expect(function () {
                return (0, utils_1.containerVolumes)([
                    {
                        sourceVolumePath: '/outside/of/workdir'
                    }
                ], true, false);
            }).toThrow();
        });
        it("all volumes should have name ".concat(k8s_1.POD_VOLUME_NAME), function () {
            var volumes = (0, utils_1.containerVolumes)([], true, true);
            expect(volumes.every(function (e) { return e.name === k8s_1.POD_VOLUME_NAME; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], true, false);
            expect(volumes.every(function (e) { return e.name === k8s_1.POD_VOLUME_NAME; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], false, true);
            expect(volumes.every(function (e) { return e.name === k8s_1.POD_VOLUME_NAME; })).toBeTruthy();
            volumes = (0, utils_1.containerVolumes)([], false, false);
            expect(volumes.every(function (e) { return e.name === k8s_1.POD_VOLUME_NAME; })).toBeTruthy();
        });
        it('should parse container ports', function () {
            var tt = [
                {
                    spec: '8080:80',
                    want: {
                        containerPort: 80,
                        hostPort: 8080,
                        protocol: 'TCP'
                    }
                },
                {
                    spec: '8080:80/udp',
                    want: {
                        containerPort: 80,
                        hostPort: 8080,
                        protocol: 'UDP'
                    }
                },
                {
                    spec: '8080/udp',
                    want: {
                        containerPort: 8080,
                        hostPort: undefined,
                        protocol: 'UDP'
                    }
                },
                {
                    spec: '8080',
                    want: {
                        containerPort: 8080,
                        hostPort: undefined,
                        protocol: 'TCP'
                    }
                }
            ];
            for (var _i = 0, tt_1 = tt; _i < tt_1.length; _i++) {
                var tc = tt_1[_i];
                var got = (0, k8s_1.containerPorts)({ portMappings: [tc.spec] });
                for (var _a = 0, _b = Object.entries(tc.want); _a < _b.length; _a++) {
                    var _c = _b[_a], key = _c[0], value = _c[1];
                    expect(got[0][key]).toBe(value);
                }
            }
        });
        it('should throw when ports are out of range (0, 65536)', function () {
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['65536'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['0'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['65536/udp'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['0/udp'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['1:65536'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['65536:1'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['1:65536/tcp'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['65536:1/tcp'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['1:'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: [':1'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['1:/tcp'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: [':1/tcp'] }); }).toThrow();
        });
        it('should throw on multi ":" splits', function () {
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['1:1:1'] }); }).toThrow();
        });
        it('should throw on multi "/" splits', function () {
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['1:1/tcp/udp'] }); }).toThrow();
            expect(function () { return (0, k8s_1.containerPorts)({ portMappings: ['1/tcp/udp'] }); }).toThrow();
        });
    });
    describe('generate container name', function () {
        it('should return the container name from image string', function () {
            expect((0, utils_1.generateContainerName)('public.ecr.aws/localstack/localstack')).toEqual('localstack');
            expect((0, utils_1.generateContainerName)('public.ecr.aws/url/with/multiple/slashes/postgres:latest')).toEqual('postgres');
            expect((0, utils_1.generateContainerName)('postgres')).toEqual('postgres');
            expect((0, utils_1.generateContainerName)('postgres:latest')).toEqual('postgres');
            expect((0, utils_1.generateContainerName)('localstack/localstack')).toEqual('localstack');
            expect((0, utils_1.generateContainerName)('localstack/localstack:latest')).toEqual('localstack');
        });
        it('should throw on invalid image string', function () {
            expect(function () {
                return (0, utils_1.generateContainerName)('localstack/localstack/:latest');
            }).toThrow();
            expect(function () { return (0, utils_1.generateContainerName)(':latest'); }).toThrow();
        });
    });
    describe('read extension', function () {
        beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        testHelper = new test_setup_1.TestHelper();
                        return [4 /*yield*/, testHelper.initialize()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, testHelper.cleanup()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw if env variable is set but file does not exist', function () {
            process.env[utils_1.ENV_HOOK_TEMPLATE_PATH] =
                '/path/that/does/not/exist/data.yaml';
            expect(function () { return (0, utils_1.readExtensionFromFile)(); }).toThrow();
        });
        it('should return undefined if env variable is not set', function () {
            delete process.env[utils_1.ENV_HOOK_TEMPLATE_PATH];
            expect((0, utils_1.readExtensionFromFile)()).toBeUndefined();
        });
        it('should throw if file is empty', function () {
            var filePath = testHelper.createFile('data.yaml');
            process.env[utils_1.ENV_HOOK_TEMPLATE_PATH] = filePath;
            expect(function () { return (0, utils_1.readExtensionFromFile)(); }).toThrow();
        });
        it('should throw if file is not valid yaml', function () {
            var filePath = testHelper.createFile('data.yaml');
            fs.writeFileSync(filePath, 'invalid yaml');
            process.env[utils_1.ENV_HOOK_TEMPLATE_PATH] = filePath;
            expect(function () { return (0, utils_1.readExtensionFromFile)(); }).toThrow();
        });
        it('should return object if file is valid', function () {
            var filePath = testHelper.createFile('data.yaml');
            fs.writeFileSync(filePath, "\nmetadata:\n  labels:\n    label-name: label-value\n  annotations:\n    annotation-name: annotation-value\nspec:\n  containers:\n    - name: test\n      image: node:14.16\n    - name: job\n      image: ubuntu:latest");
            process.env[utils_1.ENV_HOOK_TEMPLATE_PATH] = filePath;
            var extension = (0, utils_1.readExtensionFromFile)();
            expect(extension).toBeDefined();
        });
    });
    it('should merge container spec', function () {
        var base = {
            image: 'node:14.16',
            name: 'test',
            env: [
                {
                    name: 'TEST',
                    value: 'TEST'
                }
            ],
            ports: [
                {
                    containerPort: 8080,
                    hostPort: 8080,
                    protocol: 'TCP'
                }
            ]
        };
        var from = {
            ports: [
                {
                    containerPort: 9090,
                    hostPort: 9090,
                    protocol: 'TCP'
                }
            ],
            env: [
                {
                    name: 'TEST_TWO',
                    value: 'TEST_TWO'
                }
            ],
            image: 'ubuntu:latest',
            name: 'overwrite'
        };
        var expectContainer = {
            name: base.name,
            image: base.image,
            ports: __spreadArray(__spreadArray([], base.ports, true), from.ports, true),
            env: __spreadArray(__spreadArray([], base.env, true), from.env, true)
        };
        var expectJobContainer = JSON.parse(JSON.stringify(expectContainer));
        expectJobContainer.name = base.name;
        (0, utils_1.mergeContainerWithOptions)(base, from);
        expect(base).toStrictEqual(expectContainer);
    });
    it('should merge pod spec', function () {
        var base = {
            containers: [
                {
                    image: 'node:14.16',
                    name: 'test',
                    env: [
                        {
                            name: 'TEST',
                            value: 'TEST'
                        }
                    ],
                    ports: [
                        {
                            containerPort: 8080,
                            hostPort: 8080,
                            protocol: 'TCP'
                        }
                    ]
                }
            ],
            restartPolicy: 'Never'
        };
        var from = {
            securityContext: {
                runAsUser: 1000,
                fsGroup: 2000
            },
            restartPolicy: 'Always',
            volumes: [
                {
                    name: 'work',
                    emptyDir: {}
                }
            ],
            containers: [
                {
                    image: 'ubuntu:latest',
                    name: 'side-car',
                    env: [
                        {
                            name: 'TEST',
                            value: 'TEST'
                        }
                    ],
                    ports: [
                        {
                            containerPort: 8080,
                            hostPort: 8080,
                            protocol: 'TCP'
                        }
                    ]
                }
            ]
        };
        var expected = JSON.parse(JSON.stringify(base));
        expected.securityContext = from.securityContext;
        expected.restartPolicy = from.restartPolicy;
        expected.volumes = from.volumes;
        expected.containers.push(from.containers[0]);
        (0, utils_1.mergePodSpecWithOptions)(base, from);
        expect(base).toStrictEqual(expected);
    });
});
