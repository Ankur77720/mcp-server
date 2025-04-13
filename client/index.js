import { config } from "dotenv";
import readline from "readline/promises";
import { GoogleGenAI } from "@google/genai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
config();

let tools = [];
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const mcpClient = new Client({
  name: "example-client",
  version: "1.0.0",
});

const chatHistory = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

mcpClient
  .connect(new SSEClientTransport(new URL("http://localhost:3001/sse")))
  .then(async () => {
    console.log("Connected to mcp server");

    tools = (await mcpClient.listTools()).tools.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: tool.inputSchema.type,
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required,
        },
      };
    });

    chatLoop();
  });

async function chatLoop(toolCall) {
  if (toolCall) {
    console.log("calling tool ", toolCall.name);

    chatHistory.push({
      role: "model",
      parts: [
        {
          text: `calling tool ${toolCall.name}`,
          type: "text",
        },
      ],
    });

    const toolResult = await mcpClient.callTool({
      name: toolCall.name,
      arguments: toolCall.args,
    });

    chatHistory.push({
      role: "user",
      parts: [
        {
          text: "Tool result : " + toolResult.content[0].text,
          type: "text",
        },
      ],
    });
  } else {
    const question = await rl.question("You: ");
    chatHistory.push({
      role: "user",
      parts: [
        {
          text: question,
          type: "text",
        },
      ],
    });

    // Check if the user input is a mathematical operation
    const mathMatch = question.match(/(\d+)\s*[\*\/\+\-]\s*(\d+)/);
    if (mathMatch) {
      const num1 = parseInt(mathMatch[1]);
      const operator = mathMatch[2];
      const num2 = parseInt(mathMatch[3]);
      let result;

      if (operator === "*") {
        result = num1 * num2;
      } else if (operator === "+") {
        result = num1 + num2;
      } else if (operator === "-") {
        result = num1 - num2;
      } else if (operator === "/") {
        result = num1 / num2;
      }

      chatHistory.push({
        role: "model",
        parts: [
          {
            text: `The result of ${question} is: ${result}`,
            type: "text",
          },
        ],
      });

      console.log(`AI: The result of ${question} is: ${result}`);
      chatLoop(); // continue to next question
      return;
    }

    // For general queries, generate a response without needing any tool
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: chatHistory,
      config: {
        tools: [], // No tools needed here for general queries
      },
    });

    const responseText = response.candidates[0].content.parts[0].text;

    chatHistory.push({
      role: "model",
      parts: [
        {
          text: responseText,
          type: "text",
        },
      ],
    });

    console.log(`AI: ${responseText}`);

    chatLoop();
  }
}
