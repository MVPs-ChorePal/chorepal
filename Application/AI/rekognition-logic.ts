// ChorePal AI Verification Logic
// Integration: AWS Rekognition via Supabase Edge Functions

import { RekognitionClient, DetectLabelsCommand } from "@aws-sdk/client-rekognition";

/*
 * this function handles the computer vision pass
 * it scans the S3 image and returns detected object labels
 */
export async function verifyChoreWithAI(bucket: string, fileName: string) {
  const client = new RekognitionClient({ region: "us-east-2" });

  const command = new DetectLabelsCommand({
    Image: {
      S3Object: {
        Bucket: bucket,
        Name: fileName,
      },
    },
    MaxLabels: 10,
    MinConfidence: 75,
  });

  try {
    const response = await client.send(command);
    //extract label names to compare against the chore's target_label
    return response.Labels?.map(label => label.Name) || [];
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
}