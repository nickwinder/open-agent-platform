import {Client} from "@langchain/langgraph-sdk";
import {getDeployments} from "./environment/deployments";

export function createClient(deploymentId: string, accessToken?: string) {
  const deployment = getDeployments().find((d) => d.id === deploymentId);
  if (!deployment) {
    throw new Error(`Deployment ${deploymentId} not found`);
  }

  return new Client({
    apiUrl: deployment.deploymentUrl,
    defaultHeaders: {
      ...(accessToken && {Authorization: `Bearer ${accessToken}`}),
    },
  });
}
