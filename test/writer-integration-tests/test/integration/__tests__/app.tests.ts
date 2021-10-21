import { mkdirSync } from 'fs';
import { removeSync, readJSON } from 'fs-extra';
const util = require('util');
const exec = util.promisify(require('child_process').exec);
import { setup as setupDevServer, getServers } from 'jest-dev-server';
import { join } from 'path';
import { ChildProcess } from "child_process";

const path = require('path');
const host = 'http://localhost';
const reportDir = path.join(__dirname, 'screenshots');
const outputDir = join(__dirname, '../test-output/');
enum YamlFile {
    'ui5' = 'ui5.yaml',
    'ui5Mock' = 'ui5-mock.yaml',
    'ui5Local' = 'ui5-local.yaml'
}
enum NpmScript {
    'start' = 'start',
    'start-mock' = 'start-mock',
    'start-local' = 'start-local',
    'start-noflp' = 'start-noflp'
}

interface AppConfig {
    name: string;
    appId: string;
    listSelectorKey: string | undefined;
    selectorKey: string;
    listPageTitle: string | RegExp;
    title: string;
    url: string;
}
const startApp = async (projectRoot: string, yamlFileName: string, startHttpPort: number, scriptName: string): Promise<ChildProcess | undefined>  => {
    const packageJson: any = await readJSON(join(projectRoot, 'package.json'));

    try {
        const { stdout, stderr } = await exec('npm install --no-fund --no-audit --no-color', { cwd: projectRoot });
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    } catch (e) {
        console.error(e); // should contain code (exit code) and signal (that caused the termination).
    }

    expect(packageJson.scripts[scriptName]).toBeDefined();
    const npmScriptName = scriptName;
    const scriptValue = packageJson.scripts?.[scriptName];
    if(scriptValue.includes('fiori')) {
        const fioriBin = 'node ./node_modules/@sap/ux-ui5-tooling/dist/cli/index.js';
        // 'node ../../../../../../../node_modules/@sap/ux-ui5-tooling/dist/cli/index.js';
        let command: string = scriptValue.replace('fiori', fioriBin);
        // get location of --open. Assumes last param in script!!!
        // remove --open param and use it later to open page
        const openStartIndex = command.indexOf('--open');
        const port = startHttpPort;
        const openStr = command
            .slice(openStartIndex + '--open'.length, command.length)
            .replace("'", '')
            .replace("'", '')
            .trimStart();
        command = command.slice(0, openStartIndex).concat(`--port ${port}`);
        if (command.includes('--config')) {
            const indexOfConfig = command.indexOf('--config');
            const indexOfYamlConfig = command.indexOf('./', indexOfConfig);
            const indexOfDotYaml = command.indexOf('.yaml', indexOfConfig);
            const configFileName = command.slice(indexOfYamlConfig + 2, indexOfDotYaml + 4);
            const configFilePath = join(projectRoot, configFileName);
            command.replace('./' + configFileName, configFilePath);
        } else {
            command = command + ` --config ${join(projectRoot, 'ui5.yaml')}`;
        }
        // Start the server and wait for port to come up.
        const currentDir = process.cwd();
        process.chdir(projectRoot);
        await setupDevServer({
            command: command,
            launchTimeout: 40000,
            port: port as number,
            debug: true,
            host: 'localhost',
            // path: '',
            protocol: 'http',
            usedPortAction: 'kill', // or 'error'??
            waitOnScheme: {
                delay: 1000
            }
        }).catch((error: any) => {
            expect(error).toBeUndefined();
        });
    }
    const servers = getServers();

    return servers[0]
};
const checkApp = async (config: AppConfig) => {
    await page.goto(config.url, {
        waitUntil: 'load',
        // Remove the timeout
        timeout: 0
    });

    try {
        const selector = await page.waitForSelector(config.selectorKey, { visible: true, timeout: 40000 });
        expect(selector).toBeDefined();

        // if (config.listSelectorKey) {
        //     const listSelector = await page.waitForSelector(config.listSelectorKey, { visible: true, timeout: 40000 });
        //     expect(listSelector).toBeDefined();
        // }
    } catch (e) {
        await page.screenshot({
            path: path.join(
                reportDir,
                // remove http(s)://
                `${config.url
                    .replace(/(^\w+:|^)\/\//, '')
                    .replace(/\//g, '_')
                    .replace(/\./g, '_')}_${config.name.replace('', '_')}.png`
            )
        });
        throw e;
    }
    await expect(page).toMatchElement(config.selectorKey, {
        text: config.listPageTitle
    });
    const pageTile = await page.title();
    expect(pageTile).toEqual(config.title);
};

jest.setTimeout(200000);
describe('Fiori Freestyle integration tests', () => {
    beforeAll(() => {
        removeSync(reportDir);
        mkdirSync(reportDir);
    });
    describe('allTemplate/listdetail', () => {
        const appDir = join(outputDir, 'allTemplate/listdetail');
        test('npm run start - allTemplate/listdetail - should display Fiori page', async () => {
            const port = 4000;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0-titleText-inner"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
        });
        test('npm run start-noflp - allTemplate/listdetail - should display Fiori page', async () => {
            const port = 4001;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="container-test.me---list--listPageTitle-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:${port}/index.html`
            });
        });
        // Failing due bug in mockserver
        test('npm run start-local - allTemplate/listdetail- should display Fiori page', async () => {
            const port = 4002;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0-titleText-inner"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
        });
        // Failing due bug in mockserver
        test('npm run start-mock - allTemplate/listdetail - should display Fiori page', async () => {
            const port = 4003;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-mock',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0-titleText-inner"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Products /,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
        });
    });

    describe('basicTemplate/basic_no_datasource', () => {
        const appDir = join(outputDir, 'basicTemplate/basic_no_datasource');
        test('npm run start - basicTemplate/basic_no_datasource - should display Fiori page', async () => {
            const port = 4004;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: undefined,
                selectorKey: '[id="application-nods1-tile-component---View1--page-title"]',
                listPageTitle: /App Title/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#nods1-tile`
            });
        });
        test('npm run start-noflp - basicTemplate/basic_no_datasource - should display Fiori page', async () => {
            const port = 4005;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: undefined,
                selectorKey: '[id="container-nods1---View1--page-title-inner"]',
                listPageTitle: /App Title/,
                title: 'App Title',
                url: `${host}:${port}/index.html`
            });
        });
        test('npm run start-local - basicTemplate/basic_no_datasource - should display Fiori page', async () => {
            const port = 4006;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: undefined,
                selectorKey: '[id="application-nods1-tile-component---View1--page-title"]',
                listPageTitle: /App Title/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#nods1-tile`
            });
        });
        // no service === no mock
    });

    describe('allTemplate/worklist', () => {
        const appDir = join(outputDir, 'allTemplate/worklist');
        test('npm run start - allTemplate/worklist - should display Fiori page', async () => {
            const port = 4007;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-testme-app-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
        });
        test('npm run start-noflp - allTemplate/worklist - should display Fiori page', async () => {
            const port = 4008;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="container-test.me---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:${port}/index.html`
            });
        });
        test('npm run start-local - allTemplate/worklist- should display Fiori page', async () => {
            const port = 4009;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-testme-app-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
        });
        // Failing due to bug in mocksever
        test('npm run start-mock - allTemplate/worklist - should display Fiori page', async () => {
            const port = 4010;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-mock',
                appId: 'testme',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-testme-app-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
    });

    // listDetailTemplate/listdetail-good
    describe('listDetailTemplate/listdetail-good', () => {
        const appDir = join(outputDir, 'listDetailTemplate/listdetail-good');
        test('npm run start - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            const port = 40011;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
        test('npm run start-noflp - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            const port = 4012;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="container-test.me---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:${port}/index.html`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
        // Failing due bug in mockserver
        test('npm run start-local - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            const port = 4013;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-local',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
            // @ts-ignore
            fioriServer.destroy();
        });

        // Failing due to mockserver bug
        // "HTTP request failed",
        // 	"headers": \{},
        // 	"statusCode": "500",
        // 	"statusText": "Internal Server Error",
        // 	"responseText": "Cannot read property 'forEach' of undefined\r\n"
        // }
        test('npm run start-mock - listDetailTemplate/listdetail-good - should display Fiori page', async () => {
            const port = 4014;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-mock',
                appId: 'testme',
                listSelectorKey: '[id="__item0-__clone0"]',
                selectorKey: '[id="application-testme-app-component---list--listPageTitle-inner"]',
                listPageTitle: /Suppliers /,
                title: 'My Test App',
                url: `${host}:${port}/test/flpSandbox.html#testme-app`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
    });

    // worklistTemplate/worklist_service_url_v2
    describe('worklistTemplate/worklist_service_url_v2', () => {
        const appDir = join(outputDir, 'worklistTemplate/worklist_service_url_v2');
        test('npm run start - worklistTemplate/worklist_service_url_v2 - should display Fiori page', async () => {
            const port = 4014;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#wrk1-tile`
            });

            // @ts-ignore
            fioriServer.destroy();
        });
        test('npm run start-noflp - worklistTemplate/worklist_service_url_v2 - should display Fiori page', async () => {
            const port = 4015;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="container-wrk1---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:${port}/index.html`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
        test('npm run start-local - worklistTemplate/worklist_service_url_v2- should display Fiori page', async () => {
            const port = 4016;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-local',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#wrk1-tile`
            });

            // @ts-ignore
            fioriServer.destroy();
        });
        test('npm run start-mock - worklistTemplate/worklist_service_url_v2 - should display Fiori page', async () => {
            const port = 4017;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-mock',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /SEPMRA_C_PD_Product/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#wrk1-tile`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
    });

    // worklistTemplate/worklist_service_url_v4
    describe('worklistTemplate/worklist_service_url_v4', () => {
        const appDir = join(outputDir, 'worklistTemplate/worklist_service_url_v4');
        // skipped as no url currently
        test('npm run start - worklistTemplate/worklist_service_url_v4 - should display Fiori page', async () => {
            const port = 4018;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#wrk1-tile`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
        // skipped as no url currently
        test('npm run start-noflp - worklistTemplate/worklist_service_url_v4 - should display Fiori page', async () => {
            const port = 4019;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-noflp',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="container-wrk1---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'App Title',
                url: `${host}:${port}/index.html`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
        // skipped as no url currently
        test('npm run start-local - worklistTemplate/worklist_service_url_v4- should display Fiori page', async () => {
            const port = 4020;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-local',
                appId: 'wrk1',

                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#wrk1-tile`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
        test('npm run start-mock - worklistTemplate/worklist_service_url_v4 - should display Fiori page', async () => {
            const port = 4021;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-mock',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /Products/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#wrk1-tile`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
    });

    // worklistTemplate/worklist_metadata_v4
    describe('worklistTemplate/worklist_metadata_v4', () => {
        const appDir = join(outputDir, 'worklistTemplate/worklist_metadata_v4');
        test('npm run start-mock - worklistTemplate/worklist_metadata_v4 - should display Fiori page', async () => {
            const port = 4022;
            const fioriServer = await startApp(appDir, YamlFile.ui5, port, NpmScript.start);
            await checkApp({
                name: 'npm run start-mock',
                appId: 'wrk1',
                listSelectorKey: '[id="__item2-__clone0"]',
                selectorKey: '[id="application-wrk1-tile-component---worklist--tableHeader-inner"]',
                listPageTitle: /SalesOrderItem/,
                title: 'App Title',
                url: `${host}:${port}/test/flpSandbox.html#wrk1-tile`
            });
            // @ts-ignore
            fioriServer.destroy();
        });
    });
});
