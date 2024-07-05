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

const exit = (msg) => {
    console.error(msg);
    process.exit(1);
};

// Carica le variabili di ambiente dal file .env
const envPath = path.join(contextPath, ".env");
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    log("Caricate le variabili di ambiente dal file .env");
} else {
    exit(`File .env non trovato nel percorso ${envPath}`);
}

// Carica il file package.json usando readFileSync e JSON.parse
const packagePath = path.join(contextPath, "package.json");
if (!fs.existsSync(packagePath)) {
    exit(`File package.json non trovato nel percorso ${packagePath}`);
}
const packageContent = fs.readFileSync(packagePath, "utf8");
const packageJson = JSON.parse(packageContent);

// Carica il file build-info.json usando readFileSync e JSON.parse
const buildInfoPath = path.join(contextPath, "build-info.json");
let buildInfo = { buildNumber: 0 };
if (fs.existsSync(buildInfoPath)) {
    buildInfo = JSON.parse(fs.readFileSync(buildInfoPath, "utf8"));
}
log(`build-info.json content: ${JSON.stringify(buildInfo)}`);

const port = parseInt(process.env.PORT, 10);

const version = `${packageJson.version}-${buildInfo.buildNumber}`;
const autor = packageJson.author.replace(" ", "_");

// Valori di default
const defaultConfig = {
    replicas: 1,
    targetPort: 8080,
    namespace: "default",
    instance: "",
    minReplicas: 1,
    maxReplicas: 3,
    targetCPUUtilizationPercentage: 80
};

// Ottieni le configurazioni dagli input dell'azione, utilizzando i valori di default se non specificati
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

// Verifica che i parametri obbligatori siano presenti
if (!config.registry) {
    exit("Parametro 'registry' obbligatorio non fornito.");
}
if (!config.owner) {
    exit("Parametro 'owner' obbligatorio non fornito.");
}

// Definisci i metadati di base utilizzati da tutti gli oggetti
const baseMetadata = {
    labels: {
        "app.kubernetes.io/name": packageJson.name,
        "app.kubernetes.io/author": autor,
        "app.kubernetes.io/version": version,
        "app.kubernetes.io/instance": config.instance
    },
    namespace: config.namespace || "default"
};

// ConfigMap
const configMap = {
    apiVersion: "v1",
    kind: "ConfigMap",
    metadata: { ...baseMetadata, name: `${packageJson.name}-config` },
    data: dotenv.parse(fs.readFileSync(envPath))
};

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
                ],
                imagePullSecrets: [{ name: "regcred" }]
            }
        }
    }
};

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

// Opzioni YAML
const yamlOptions = {
    noRefs: true,
    styles: { "!!str": "double" }
};

const yamlContents = [];
yamlContents.push(yaml.dump(configMap, yamlOptions));
yamlContents.push(yaml.dump(service, yamlOptions));
yamlContents.push(yaml.dump(deployment, yamlOptions));
yamlContents.push(yaml.dump(autoscaler, yamlOptions));

const allYaml = yamlContents.join("\n---\n");

const directoryPath = path.join('.', "k8s"); // Imposta il percorso della directory

// Verifica se la directory esiste
if (!fs.existsSync(directoryPath)) {
    // Se non esiste, creala
    fs.mkdirSync(directoryPath, { recursive: true });
    log(`Creata la directory ${directoryPath}`);
}

// Scrive il file YAML finale
fs.writeFile(path.join(directoryPath, "all-in-one.yaml"), allYaml, "utf8", (err) => {
    if (err) {
        console.error("Errore durante la scrittura del file YAML:", err);
        core.setFailed(`Errore durante la scrittura del file YAML: ${err.message}`);
    } else {
        log("File YAML all-in-one creato con successo!");
    }
});
