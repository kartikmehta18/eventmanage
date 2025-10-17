// "use server";

// import { GoogleGenerativeAI } from "@google/generative-ai";
// import { connectToDatabase } from '@/lib/db';
// import Students, { IStudent } from '@/models/Students';
// import Event, { IEvent } from '@/models/Event';

// // Initialize the Google Generative AI client with your API key
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// /**
//  * Provides context to the AI model about the available tools/functions.
//  */
// const tools = [
//   {
//     "functionDeclarations": [
//       {
//         "name": "get_student_details",
//         "description": "Get details for a specific student, like email, roll number, and registered events.",
//         "parameters": {
//           "type": "OBJECT",
//           "properties": {
//             "studentName": { "type": "STRING", "description": "The name of the student to look up." }
//           },
//           "required": ["studentName"]
//         }
//       },
//       {
//         "name": "check_attendance",
//         "description": "Check if a specific student attended a specific event.",
//         "parameters": {
//           "type": "OBJECT",
//           "properties": {
//             "studentName": { "type": "STRING", "description": "The name of the student." },
//             "eventName": { "type": "STRING", "description": "The name of the event." }
//           },
//           "required": ["studentName", "eventName"]
//         }
//       },
//       {
//         "name": "list_event_attendees",
//         "description": "List all students who registered for a specific event.",
//         "parameters": {
//           "type": "OBJECT",
//           "properties": {
//             "eventName": { "type": "STRING", "description": "The name of the event." }
//           },
//           "required": ["eventName"]
//         }
//       }
//     ]
//   }
// ];

// /**
//  * Main function to get the chatbot's response.
//  * @param userMessage The message from the user.
//  * @returns The chatbot's text response.
//  */
// export async function getBotResponse(userMessage: string): Promise<string> {
//   await connectToDatabase();

//   // Initialize the model with the updated, cost-effective model name
//   const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" }); // <-- THIS LINE WAS CHANGED

//   // Start the chat WITH tools
//   const chat = model.startChat({ tools });

//   const result = await chat.sendMessage(userMessage);
//   const response = result.response;

//   if (response.functionCalls) {
//     const functionCalls = response.functionCalls;
//     const call = functionCalls[0];
    
//     let functionResponse;

//     if (call.name === 'get_student_details') {
//       const { studentName } = call.args;
//       const student = await Students.findOne({ name: new RegExp(`^${studentName}$`, 'i') }).lean<IStudent>();
//       functionResponse = student 
//         ? `Details for ${student.name}: Email: ${student.email}, Roll Number: ${student.rollNumber}, Registered for: ${student.eventName}.`
//         : `Student "${studentName}" not found.`;
//     } 
//     else if (call.name === 'check_attendance') {
//       const { studentName, eventName } = call.args;
//       const student = await Students.findOne({ 
//         name: new RegExp(`^${studentName}$`, 'i'),
//         eventName: new RegExp(`^${eventName}$`, 'i') 
//       }).lean<IStudent>();
      
//       if (!student) {
//         functionResponse = `Student "${studentName}" not registered for "${eventName}".`;
//       } else {
//         const event = await Event.findOne({ eventName: new RegExp(`^${eventName}$`, 'i') }).lean<IEvent>();
//         // Simplified attendance check
//         const attended = student.attendance && student.attendance.length > 0;
//         functionResponse = attended 
//           ? `Yes, ${student.name} attended ${event?.eventName}.`
//           : `No, ${student.name} did not attend ${event?.eventName}.`;
//       }
//     } 
//     else if (call.name === 'list_event_attendees') {
//         const { eventName } = call.args;
//         const students = await Students.find({ eventName: new RegExp(`^${eventName}$`, 'i') }).lean<IStudent[]>();
//         if (students.length === 0) {
//             functionResponse = `No students found for event "${eventName}".`;
//         } else {
//             const studentNames = students.map(s => s.name).join(', ');
//             functionResponse = `Students registered for ${eventName}: ${studentNames}.`;
//         }
//     }

//     // Send the result of the function call back to the model
//     const result2 = await chat.sendMessage(JSON.stringify({
//         functionResponse: {
//             name: call.name,
//             response: { content: functionResponse }
//         }
//     }));

//     return result2.response.text();
//   }

//   // If there's no function call, just return the model's text response.
//   return response.text();
// }