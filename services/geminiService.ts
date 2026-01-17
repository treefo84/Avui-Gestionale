
import { GoogleGenAI, Type } from "@google/genai";
import { Activity, Assignment, Availability, Boat, BoatType, Role, User } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert sailing school scheduler. 
Your goal is to assign Instructors and Helpers to Boats for a specific date based on availability and constraints.
Rules:
1. Each boat needs exactly 1 Instructor and 1 Helper.
2. 'Tukè' is a POWER boat and cannot do SAILING activities.
3. 'Trilly' and 'Tucanò' are SAILING boats.
4. Only assign users who are marked as AVAILABLE.
5. Try to distribute work evenly if possible, but priority is filling the slots.
6. A single User cannot be assigned to multiple boats on the same day.
7. Return a JSON structure.
`;

interface ScheduleSuggestionInput {
  date: string;
  boats: Boat[];
  users: User[];
  availabilities: Availability[];
  activities: Activity[];
}

export const suggestSchedule = async (input: ScheduleSuggestionInput): Promise<Partial<Assignment>[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API Key found for Gemini");
    return [];
  }

  // Always use a new instance with the API key from environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Filter available users
  const availableUserIds = input.availabilities
    .filter(a => a.date === input.date && a.status === 'AVAILABLE')
    .map(a => a.userId);
  
  const availableInstructors = input.users.filter(u => u.role === Role.INSTRUCTOR && availableUserIds.includes(u.id));
  const availableHelpers = input.users.filter(u => u.role === Role.HELPER && availableUserIds.includes(u.id));

  const prompt = `
    Date: ${input.date}
    Boats: ${JSON.stringify(input.boats)}
    Available Instructors: ${JSON.stringify(availableInstructors)}
    Available Helpers: ${JSON.stringify(availableHelpers)}
    Activities: ${JSON.stringify(input.activities)}

    Please create a valid assignment list for this date. 
    Assign an appropriate activity to each boat.
    If there are not enough people, fill as many boats as possible.
  `;

  try {
    // Using gemini-3-pro-preview for complex reasoning tasks like scheduling
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              boatId: { type: Type.STRING },
              instructorId: { type: Type.STRING },
              helperId: { type: Type.STRING },
              activityId: { type: Type.STRING },
            },
            required: ["boatId", "instructorId", "helperId", "activityId"]
          }
        }
      }
    });

    // Directly access the text property
    const text = response.text;
    if (!text) return [];
    
    const suggestions = JSON.parse(text) as Partial<Assignment>[];
    
    // Add the date and generate a temp ID
    return suggestions.map(s => ({
      ...s,
      id: crypto.randomUUID(),
      date: input.date,
      durationDays: 2 // Default to weekend
    }));

  } catch (error) {
    console.error("Gemini scheduling failed", error);
    return [];
  }
};
