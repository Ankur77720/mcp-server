import { config } from "dotenv";
import { TwitterApi } from "twitter-api-v2";
config();

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

export async function createPost(status) {
  try {
    const newPost = await twitterClient.v2.tweet(status);
    console.log("✅ Tweet Success:", newPost);

    return {
      content: [
        {
          type: "text",
          text: `Tweeted: ${status}`,
        },
      ],
    };
  } catch (error) {
    console.error("❌ Tweet Failed:");
    console.error("Status Code:", error.code || error.response?.status);
    console.error("Error Message:", error.message);
    console.error("Full Error:", error);

    return {
      content: [
        {
          type: "text",
          text: `Error creating tweet: ${error.message}`,
        },
      ],
    };
  }
}
