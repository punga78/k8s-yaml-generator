# K8s YAML Generator GitHub Action

This GitHub Action generates Kubernetes YAML files from configuration and environment variables. It leverages inputs from the user to create ConfigMap, Service, Deployment, and HorizontalPodAutoscaler YAML files.

## Usage

To use this action in your GitHub workflow, add the following steps to your `.gitea/workflows/*.yml` file:

```yaml
name: Generate K8s YAML

on: [push]

jobs:
  generate-yaml:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Generate K8s YAML
        uses: ./
        with:
          instance: 'my-instance'
          namespace: 'my-namespace'
          serviceType: 'ClusterIP'
          envName: '.env'
          targetPort: 8080
          replicas: 3
          registry: 'my-registry'
          owner: 'my-owner'
          directoryPath: k8s
          imagePullSecretsName: regcred
          minReplicas: 1
          maxReplicas: 5
          targetCPUUtilizationPercentage: 75
          verbose: 'true'
          path: './config'
          cpuRequest: '500m'
          memoryRequest: '512Mi'
          cpuLimit: '1000m' 
          memoryLimit: '1024Mi' 
```

## Inputs

| Input                            | Description                                                   | Required | Default            |
|----------------------------------|---------------------------------------------------------------|----------|--------------------|
| `instance`                       | Instance of the application                                   | No       | `''`               |
| `namespace`                      | Namespace for Kubernetes                                      | No       | `default`          |
| `serviceType`                    | Type of Kubernetes Service                                    | No       | `ClusterIP`        |
| `targetPort`                     | Target port for the service                                   | No       | `8080`             |
| `replicas`                       | Number of replicas for the deployment                         | No       | `1`                |
| `registry`                       | Docker registry for the image                                 | Yes      |                    |
| `owner`                          | Owner of the Docker image                                     | Yes      |                    |
| `minReplicas`                    | Minimum replicas for the HorizontalPodAutoscaler              | No       | `1`                |
| `maxReplicas`                    | Maximum replicas for the HorizontalPodAutoscaler              | No       | `3`                |
| `targetCPUUtilizationPercentage` | Target CPU Utilization Percentage for the HorizontalPodAutoscaler | No       | `80`               |
| `verbose`                        | Enable verbose logging                                        | No       | `false`            |
| `path`                           | Directory path for package.json, build-info.json, and .env files | No       | `.`                |
| `cpuRequest`| The minimum amount of CPU guaranteed for each container, expressed in milliCPU (e.g., 500m means 50% of a CPU). | No |`500m`|
| `memoryRequest`| The minimum amount of memory guaranteed for each container, expressed in MiB (e.g., 512Mi). | No |`512Mi`|
| `cpuLimit`| The maximum amount of CPU a container can use, expressed in milliCPU (e.g., 1000m means one full CPU). | No |`1000m`|
| `memoryLimit`| The maximum amount of memory a container can use, expressed in MiB (e.g., 1024Mi). | No |`1024Mi`|

## Outputs

This action produce artifact.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
