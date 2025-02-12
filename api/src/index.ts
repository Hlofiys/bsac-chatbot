import express from 'express';
import cors from 'cors';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { Document } from 'langchain/document';
import * as fs from 'fs/promises';
import fsync from 'node:fs';
import pdf from 'pdf-parse';
import * as path from 'path';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { CohereEmbeddings } from "@langchain/cohere";
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { HumanMessage, AIMessage, BaseMessage, BaseMessageFields } from "@langchain/core/messages";


const app = express();
const port = process.env.PORT || 3000;

// Configuration
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY!;
const COHERE_API_KEY = process.env.COHERE_API_KEY!;
const CHROMA_URL = process.env.CHROMA_URL!;
const DATA_DIRECTORY = path.join(__dirname, '../data');
const CHROMA_COLLECTION_NAME = 'chatbot-collection';

const additional_context = fsync.readFileSync(path.join("./context.txt")).toString();

// Initialize clients and models
const model = new ChatGoogleGenerativeAI({
    apiKey: GOOGLE_API_KEY,
    modelName: 'gemini-pro', // Using gemini-pro is generally better for chat
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE, // Adjust as needed
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        }

    ],
    maxOutputTokens: 4096,
    temperature: 0.5,
    topP: 0.8
});
const embeddings = new CohereEmbeddings({
    apiKey: COHERE_API_KEY,
    model: 'embed-multilingual-v3.0',
});

app.use(express.json());
app.use(cors());

/**
 * Preprocesses the raw text extracted from a PDF.
 */
function preprocessText(text: string): string {
    // Normalize whitespace (convert multiple spaces/newlines to a single space)
    let processed = text.replace(/\s+/g, ' ').trim();
    return processed;
}

// PDF Upload and Processing Endpoint
app.post('/api/upload', async (req, res): Promise<any> => {
    try {
        const files = await fs.readdir(DATA_DIRECTORY);
        const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

        let rawDocs: Document[] = [];
        for (const pdfFile of pdfFiles) {
            const filePath = path.join(DATA_DIRECTORY, pdfFile);
            const fileContent = await fs.readFile(filePath);
            const pdfData = await pdf(fileContent);
            const cleanText = preprocessText(pdfData.text);
            rawDocs.push(new Document({
                pageContent: cleanText,
                metadata: { source: pdfFile }
            }));
        }

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1024,       // Increased chunk size
            chunkOverlap: 200,    // Increased overlap
        });
        const docs = await textSplitter.splitDocuments(rawDocs);
        console.log(`Split document into ${docs.length} chunks`);

        const chromaStore = await Chroma.fromDocuments(docs, embeddings, { collectionName: CHROMA_COLLECTION_NAME, url: CHROMA_URL });
        const count = await chromaStore.collection?.count();
        console.log(`Documents in collection: ${count}`);
        console.log('Documents added to ChromaDB');
        return res.json({ success: true, chunksAdded: docs.length });
    } catch (error: any) {
        console.error("Error ingesting data:", error);
        return res.status(500).json({ error: 'Failed to ingest data', details: error.message });
    }
});

// Helper function to retrieve (or create) a Chroma vector store
const createChromaStore = async (embeddings: CohereEmbeddings, collectionName: string) => {
    try {
        return await Chroma.fromExistingCollection(embeddings, { collectionName, url: CHROMA_URL });
    } catch (e) {
        console.log(`Collection "${collectionName}" not found, creating a new one.`);
        return new Chroma(embeddings, { collectionName, url: CHROMA_URL });
    }
};


// Chat Endpoint with RAG and Chat History
app.post('/api/chat', async (req, res): Promise<any> => {
    try {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
        res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
        const { message, history } = req.body;  // Receive history as well

        if (!message) return res.status(400).json({ error: 'Message required' });

        // Retrieve relevant context from vector store
        const vectorStore = await createChromaStore(embeddings, CHROMA_COLLECTION_NAME);

        const chatHistory: BaseMessage[] = [];

        if (Array.isArray(history)) {
            for (const turn of history) {
                if (turn.role && turn.content) {
                    if (turn.role === 'user') {
                        chatHistory.push(new HumanMessage(turn.content));
                    } else if (turn.role === 'assistant') {
                        chatHistory.push(new AIMessage(turn.content));
                    }
                } else {
                    console.warn("Invalid history entry:", turn);
                }
            }
        } else if (history) {
            console.warn("History is not an array:", history);
        }

        chatHistory.push(new HumanMessage(message));

        const systemPrompt = `You are a helpful and friendly learning assistant for students of colleague names BSAC(Belarusian State Academy of Communications). Your primary goal is to assist students in understanding a specific topic.  You will be provided with background information (context) and specific data relevant to the topic.  You should use this information *exclusively* to answer student questions. Do not use any prior knowledge beyond what is provided in the context and data.

Here's how you should interact with students:

1.  **Introduction:** Begin by briefly introducing yourself and the topic you'll be helping with, based on the provided context.  Keep it concise (1-2 sentences). Mention that you'll be using the provided information to help them.

2.  **Initial Question:**  After the introduction, ask the student an open-ended question related to the topic to gauge their understanding and get the conversation started. Avoid simple yes/no questions.  Examples:
    *   "What's the first thing that comes to mind when you think about [topic]?"
    *   "What are you hoping to learn about [topic] today?"
    *   "What's one aspect of [topic] that you find particularly interesting or confusing?"
    *   "Based on what you already know, what's a question you have about [topic]?"

3.  **Responding to Student Questions/Statements:**
    *   **Use the Provided Information:**  *Always* prioritize using the provided context and data to answer questions.  If the answer is not found within the provided information, state that clearly (see "Handling Unanswerable Questions" below).
    *   **Explain Clearly:** Break down complex concepts into simpler terms, using examples from the provided data whenever possible.
    *   **Cite Your Source (Within the Context):** Subtly indicate where in the provided context the information came from.  For example:  "According to the background information, ...", or "As the data shows...", or "The context mentions that...".  This helps students learn to locate information themselves.
    *   **Check for Understanding:** After answering a question, ask a follow-up question to ensure the student understands. Examples:
        *   "Does that make sense?"
        *   "Can you explain that back to me in your own words?"
        *   "Do you have any other questions about that part?"
        *   "Based on what we just discussed, what do you think would happen if...?"
    *   **Encourage Further Exploration:** If the student answers a question correctly, or demonstrates understanding, encourage them to go deeper.  Suggest related concepts *within the provided context*.
    *   **Be Patient and Supportive:** Use encouraging language. Avoid being overly technical or judgmental. Rephrase your explanations if the student is struggling.
    *   **Keep the conversation going**: Ask open questions to continue the conversation.

4.  **Handling Unanswerable Questions:**
    *   **Be Honest:**  If the answer to a question is not found within the provided context and data, say so directly.  For example:
        *   "That's a great question! Unfortunately, the information I have here doesn't cover that specific aspect."
        *   "I'm not able to find the answer to that in the provided materials."
    *  **Offer a suggestion (Only if possible based on given materials):** "Based on the text, it says {quote}. We do not have information to confirm this, but it may be related to your question"

5. **Steering the conversation**:
   * If the student is off the topic: "That is interesting. However, based on this text {provide context}, let's focus on [topic]".
   * If student gives short, unengaged answers: Acknowledge their answer, provide information, and ask a related, open-ended question: "Yes, that's correct. The text mentions [relevant information]. What are your thoughts on [related concept]?"
   * If student is repeating question. Explain in different words, and ask a different, but related question.

**Example of Context and Data (You will replace this with the actual information):**`;


        // Function to get context for a specific message
        const getContextForMessage = async (userMessage: string): Promise<string> => {
            const relevantDocs = await vectorStore.similaritySearch(userMessage);
            return relevantDocs.map(doc => doc.pageContent).join('\n\n');
        };

      // Build messages with dynamic context for each user turn.
        const messagesWithContext: BaseMessage[] = [];
        messagesWithContext.push(new HumanMessage(systemPrompt)); // System prompt first
        messagesWithContext.push(new HumanMessage(additional_context));

        for (const msg of chatHistory) {
            if (msg instanceof HumanMessage) {
                const dynamicContext = await getContextForMessage(msg.content.toString());
                messagesWithContext.push(new HumanMessage({ content: `Методические указания:\n${dynamicContext}\n\nВопрос: ${msg.content}` }));
            } else {
                messagesWithContext.push(msg); // Add AI messages as they are
            }
        }


        const result = await model.invoke(messagesWithContext);
        res.json({ response: result.content });

    } catch (error: any) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to generate response', details: error.message, stack: error.stack }); // Include stack trace for debugging
    }
});

app.listen(port, () => console.log(`Server running on port ${port}`));