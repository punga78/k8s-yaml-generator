const core = require('@actions/core');
const fs = require("fs");
const yaml = require("js-yaml");
const dotenv = require("dotenv");
const path = require("path");

const verbose = core.getInput("verbose") === "true";

function log(msg) {
    if (verbose) {
        console.log(msg);
    }
}

const contextPath = core.getInput("path") || '.';
log(`contextPath: ${contextPath}`);

const directoryPath = core.getInput("directoryPath") || path.join('.', "k8s");
log(`directoryPath: ${directoryPath}`);

const imagePullSecretsName = core.getInput("imagePullSecretsName");
log(`imagePullSecretsName: ${imagePullSecretsName}`);

// Function to exit with an error message
const exit = (msg) => {
    console.error(msg);
    core.setFailed(`Error writing the YAML file: ${msg}`);
    process.exit(1);
};

const envName = core.getInput("envName") || ".env";
// Load environment variables from the .env file
const envPath = path.join(contextPath, envName);
log(`envPath: ${envPath}`);

let envConfig = {};
const envExist = fs.existsSync(envPath);
if (envExist) {
    dotenv.config({ path: envPath });
    log(`Loaded environment variables from the ${envPath} file`);
    // Set default values for PORT and HOST if not defined
    envConfig = dotenv.parse(fs.readFileSync(envPath));
    log(`envConfig: ${JSON.stringify(envConfig)}`);
}

// Add PORT and HOST to envConfig if not present
envConfig.PORT = parseInt(envConfig.PORT || '3000', 10);
log(`envConfig.PORT: ${envConfig.PORT}`);

envConfig.HOST = envConfig.HOST || '0.0.0.0';
log(`envConfig.HOST: ${envConfig.HOST}`);

const port = envConfig.PORT;
log(`port: ${port}`);

// Load the package.json file using readFileSync and JSON.parse
const packagePath = path.join(contextPath, "package.json");
log(`packagePath: ${packagePath}`);

if (!fs.existsSync(packagePath)) {
    exit(`package.json file not found at path ${packagePath}`);
}
const packageContent = fs.readFileSync(packagePath, "utf8");
log(`packageContent: ${packageContent}`);

const packageJson = JSON.parse(packageContent);
log(`packageJson: ${JSON.stringify(packageJson)}`);

// Load the build-info.json file using readFileSync and JSON.parse
const buildInfoPath = path.join(contextPath, "build-info.json");
log(`buildInfoPath: ${buildInfoPath}`);

let buildInfo = { buildNumber: 0 };
if (fs.existsSync(buildInfoPath)) {
    buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
}
log(`buildInfo: ${JSON.stringify(buildInfo)}`);

const version = `${packageJson.version}-${buildInfo.buildNumber}`;
log(`version: ${version}`);

const author = packageJson.author.replace(" ", "_");
log(`author: ${author}`);

// Default values
const defaultConfig = {
    replicas: 1,
    targetPort: 8080,
    namespace: "default",
    instance: "",
    minReplicas: 1,
    maxReplicas: 3,
    targetCPUUtilizationPercentage: 80
};
log(`defaultConfig: ${JSON.stringify(defaultConfig)}`);

// Get configurations from the action inputs, using default values if not specified
const config = {
    instance: core.getInput('instance') || defaultConfig.instance,
    namespace: core.getInput('namespace') || defaultConfig.namespace,
    serviceType: core.getInput('serviceType') || 'ClusterIP',
    targetPort: parseInt(core.getInput('targetPort'), 10) || defaultConfig.targetPort,
    replicas: parseInt(core.getInput('replicas'), 10) || defaultConfig.replicas,
    registry: core.getInput('registry', { required: true }),
    owner: core.getInput('owner', { required: true }),
    minReplicas: parseInt(core.getInput('minReplicas'), 10) || defaultConfig.minReplicas,
    maxReplicas: parseInt(core.getInput('maxReplicas'), 10) || defaultConfig.maxReplicas,
    targetCPUUtilizationPercentage: parseInt(core.getInput('targetCPUUtilizationPercentage'), 10) || defaultConfig.targetCPUUtilizationPercentage
};
log(`config: ${JSON.stringify(config)}`);

// Ensure mandatory parameters are present
if (!config.registry) {
    exit("Mandatory parameter 'registry' not provided.");
}
if (!config.owner) {
    exit("Mandatory parameter 'owner' not provided.");
}

// Define basic metadata used by all objects
const baseMetadata = {
    labels: {
        "app.kubernetes.io/name": packageJson.name,
        "app.kubernetes.io/author": author,
        "app.kubernetes.io/version": version,
        "app.kubernetes.io/instance": config.instance
    },
    namespace: config.namespace || "default"
};
log(`baseMetadata: ${JSON.stringify(baseMetadata)}`);

// ConfigMap
const configMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: { ...baseMetadata, name: `${packageJson.name}-config` },
    data: envConfig
};
if (envExist)
    log(`configMap: ${JSON.stringify(configMap)}`);

// Service
const service = {
    apiVersion: "v1",
    kind: "Service",
    metadata: { ...baseMetadata, name: `${packageJson.name}-service` },
    spec: {
        type: config.serviceType,
        selector: baseMetadata.labels,
        ports: [{ port: config.targetPort, targetPort: port, protocol: "TCP" }]
    }
};
log(`service: ${JSON.stringify(service)}`);

// Deployment
const deployment = {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: { ...baseMetadata, name: `${packageJson.name}` },
    spec: {
        replicas: config.replicas,
        selector: { matchLabels: baseMetadata.labels },
        template: {
            metadata: { labels: baseMetadata.labels },
            spec: {
                containers: [
                    {
                        name: packageJson.name,
                        image: `${config.registry}/${config.owner}/${packageJson.name}:${version}`,
                        ports: [{ containerPort: port }],
                        envFrom: [{ configMapRef: { name: `${packageJson.name}-config` } }],
                        imagePullPolicy: "Always"
                    }
                ]
            }
        }
    }
};
log(`deployment: ${JSON.stringify(deployment)}`);

// Add imagePullSecrets if imagePullSecretsName is specified
if (imagePullSecretsName) {
    deployment.spec.template.spec.imagePullSecrets = [{ name: imagePullSecretsName }];
    log(`deployment.spec.template.spec.imagePullSecrets: ${JSON.stringify(deployment.spec.template.spec.imagePullSecrets)}`);
}

// HorizontalPodAutoscaler
const autoscaler = {
    apiVersion: "autoscaling/v1",
    kind: "HorizontalPodAutoscaler",
    metadata: { ...baseMetadata, name: `${packageJson.name}-autoscaler` },
    spec: {
        scaleTargetRef: {
            apiVersion: "apps/v1",
            kind: "Deployment",
            name: packageJson.name
        },
        minReplicas: config.minReplicas,
        maxReplicas: config.maxReplicas,
        targetCPUUtilizationPercentage: config.targetCPUUtilizationPercentage
    }
};
log(`autoscaler: ${JSON.stringify(autoscaler)}`);

// YAML options
const yamlOptions = {
    noRefs: true,
    styles: { "!!str": "double" }
};
log(`yamlOptions: ${JSON.stringify(yamlOptions)}`);

const yamlContents = [];
if (envExist)
    yamlContents.push(yaml.dump(configMap, yamlOptions));
yamlContents.push(yaml.dump(service, yamlOptions));
yamlContents.push(yaml.dump(deployment, yamlOptions));
yamlContents.push(yaml.dump(autoscaler, yamlOptions));

const allYaml = yamlContents.join("\n---\n");
log(`allYaml: ${allYaml}`);

// Check if the directory exists
if (!fs.existsSync(directoryPath)) {
    // If not, create it
    fs.mkdirSync(directoryPath, { recursive: true });
    log(`Created directory ${directoryPath}`);
}

// Write the final YAML file
fs.writeFile(path.join(directoryPath, "all-in-one.yaml"), allYaml, "utf8", (err) => {
    if (err) {
        console.error("Error writing the YAML file:", err);
    } else {
        log("Successfully created the all-in-one YAML file!");
    }
});
