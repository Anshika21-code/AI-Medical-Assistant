import Conversation from "../models/Conversation.js";
import { getResearchDataInternal } from "./researchHelper.js";
import { buildPrompt } from "../services/promptBuilder.js";
import { callLLM } from "../services/llm.js";

export const chatHandler = async (req, res) => {
  try {
    const { userId, message, disease, location } = req.body;

    // 1️⃣ Get previous conversation
    let convo = await Conversation.findOne({ userId });

    if (!convo) {
      convo = await Conversation.create({
        userId,
        messages: [],
        context: { disease, location },
      });
    }

    // 2️⃣ Context-aware query
    const prevDisease = convo.context?.disease;

    let finalDisease = disease || prevDisease;

    let finalQuery = message;

    if (!message.toLowerCase().includes(finalDisease?.toLowerCase())) {
      finalQuery = `${message} AND ${finalDisease}`;
    }

    // 3️⃣ Fetch research
    const researchData = await getResearchDataInternal(finalQuery, finalDisease);

    // 4️⃣ Build LLM prompt
    const prompt = buildPrompt({
      query: message,
      disease: finalDisease,
      data: researchData,
    });

    // 5️⃣ Call LLM
    const aiResponse = await callLLM(prompt);

    // 6️⃣ Save conversation
    convo.messages.push(
      { role: "user", content: message },
      { role: "assistant", content: aiResponse }
    );

    convo.context.disease = finalDisease;

    await convo.save();

    // 7️⃣ Return response
    res.json({
      response: aiResponse,
      research: researchData,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chat failed" });
  }
};