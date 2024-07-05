# K8s YAML Generator GitHub Action

This GitHub Action generates Kubernetes YAML files from configuration and environment variables. It leverages inputs from the user to create ConfigMap, Service, Deployment, and HorizontalPodAutoscaler YAML files.

## Usage

To use this action in your GitHub workflow, add the following steps to your `.github/workflows/*.yml` file:

```yaml
name: Generate K8s YAML

on: [push]

jobs:
  generate-yaml:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2
      - name: Generate K8s YAML
        uses: ./
        with:
          instance: 'my-instance'
          namespace: 'my-namespace'
          serviceType: 'ClusterIP'
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

## Outputs

This action does not produce any outputs.

## Example

Below is an example of a GitHub workflow that uses this action:

```yaml
name: Generate K8s YAML

on: [push]

jobs:
  generate-yaml:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2
      - name: Generate K8s YAML
        uses: ./
        with:
          instance: 'example-instance'
          namespace: 'example-namespace'
          serviceType: 'ClusterIP'
          targetPort: 8080
          replicas: 2
          registry: 'dockerhub.io'
          owner: 'example-owner'
          minReplicas: 1
          maxReplicas: 5
          targetCPUUtilizationPercentage: 75
          verbose: 'true'
          path: './config'
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with your changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
