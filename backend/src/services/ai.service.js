import { GoogleGenAI } from "@google/genai";
import { fetchGithubContent, fetchGoogleDocContent, fetchNotionContent, fetchFigmaContent } from "./submission-content.service.js";
import { ApiError } from "../utils/ApiError.js";

const getGenAI = () => {
  if (!process.env.GEMINI_API_KEY) {
    throw new ApiError(500, "GEMINI_API_KEY not configured");
  }
  return new GoogleGenAI(process.env.GEMINI_API_KEY);
};

/**
 * Generate a project using Google Gemini AI
 * @param {String} roleName - e.g., "Software Engineer"
 * @param {String} roleSlug - e.g., "software-engineer"
 * @param {String} level - "beginner" | "intermediate" | "advanced"
 * @param {String} domain - "fintech" | "edtech" | "healthtech" | etc.
 * @returns {Object} Project data with title, problem_statement, deliverables, etc.
 */
export const generateProjectWithAI = async (roleName, roleSlug, level, domain) => {
  try {
    const systemPrompt = `You are an expert project designer for software engineering interviews and learning platforms. 
Your task is to create realistic, role-specific coding projects that test technical skills and professional judgment.

Role Context: ${roleName} (${roleSlug})
Difficulty Level: ${level}
Domain: ${domain}

Create a ${level}-level project for a ${roleName} in the ${domain} domain.

Guidelines for ${level}:
${
  level === "beginner"
    ? `- Simple core concept demonstration
- Basic API or CLI application
- ~10-15 hours to complete
- Focus on fundamentals and best practices
- Clear requirements and success criteria`
    : level === "intermediate"
    ? `- Real-world problem with some complexity
- Multiple components/services
- ~20-30 hours to complete
- Requires system design thinking
- Some edge cases to handle`
    : `- Complex system design
- Multiple integrations or services
- ~40-60 hours to complete
- Advanced optimization required
- Production-grade code quality expected`
}

Role-specific expectations:
${getRoleSpecificPrompt(roleSlug)}

Return your response as valid JSON with this exact structure (no markdown, no code blocks):
{
  "title": "Project Title Here",
  "problem_statement": "Clear description of what needs to be built and why",
  "context": "Background information and business context",
  "deliverables": "- Bullet point 1\\n- Bullet point 2\\n- etc.",
  "evaluation_rubric": "- Evaluation criteria 1\\n- Evaluation criteria 2\\n- etc.",
  "focus_area": "Key skill being tested",
  "estimated_hours": ${level === "beginner" ? "12" : level === "intermediate" ? "24" : "48"},
  "hints": ["Hint 1", "Hint 2", "Hint 3"]
}`;

    const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: systemPrompt,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();

    // Parse JSON from response
    let projectData;
    try {
      projectData = JSON.parse(responseText);
    } catch (parseError) {
      // Try to extract JSON if wrapped in markdown
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        projectData = JSON.parse(jsonMatch[0]);
      } else {
        throw new ApiError(500, "Failed to parse AI response as JSON");
      }
    }

    return projectData;
  } catch (error) {
    console.error("AI Project Generation Error:", error);
    throw new ApiError(500, `Failed to generate project: ${error.message}`);
  }
};

/**
 * Grade a student submission using Google Gemini AI
 * @param {Object} project - Project document with title, problem_statement, evaluation_rubric
 * @param {Object} submission - Submission document with submission_link, submission_type, fetched_content
 * @param {String} role - Role name (e.g., "Software Engineer")
 * @param {String} level - Difficulty level
 * @returns {Object} Grading result with score, feedback, filesReviewed, accessible
 */
export const gradeSubmissionWithAI = async (project, submission, role, level) => {
  try {
    // Fetch submission content based on submission type
    let submissionContent = submission.fetched_content;
    let filesReviewed = [];
    let accessible = true;

    if (!submissionContent) {
      try {
        const contentData = await fetchSubmissionContent(
          submission.submission_link,
          submission.submission_type
        );
        submissionContent = contentData.content;
        filesReviewed = contentData.filesReviewed || [];
        accessible = contentData.accessible !== false;
      } catch (fetchError) {
        console.error("Content fetch error:", fetchError);
        accessible = false;
        submissionContent = `[Content could not be fetched: ${fetchError.message}]`;
      }
    }

    const gradingPrompt = `You are an expert technical interviewer and project reviewer for the ${role} role.

PROJECT DETAILS:
Title: ${project.title}
Problem Statement: ${project.problem_statement}
Context: ${project.context}
Deliverables: ${project.deliverables}

EVALUATION RUBRIC:
${project.evaluation_rubric}

DIFFICULTY LEVEL: ${level}

STUDENT SUBMISSION:
Link: ${submission.submission_link}
Type: ${submission.submission_type}
Approach/Notes: ${submission.approach_text || "No notes provided"}

SUBMISSION CONTENT:
${submissionContent.substring(0, 5000)}
${submissionContent.length > 5000 ? "\n[Content truncated...]" : ""}

Please evaluate this submission based on:
1. Code quality and best practices
2. Problem understanding
3. Solution completeness
4. Architecture/design decisions
5. Testing and error handling
6. Adherence to requirements

Provide a score from 0-100 and detailed feedback.

Return your response as valid JSON with this exact structure (no markdown):
{
  "score": 75,
  "feedback": "Detailed feedback about the submission...",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Area to improve 1", "Area to improve 2"],
  "rubric_scores": {
    "code_quality": 8,
    "problem_understanding": 9,
    "completeness": 7,
    "architecture": 8,
    "testing": 6,
    "requirements": 8
  }
}`;

    const model = getGenAI().getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: gradingPrompt,
            },
          ],
        },
      ],
    });

    const responseText = result.response.text();

    let gradingData;
    try {
      gradingData = JSON.parse(responseText);
    } catch (parseError) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        gradingData = JSON.parse(jsonMatch[0]);
      } else {
        throw new ApiError(500, "Failed to parse grading response");
      }
    }

    return {
      score: gradingData.score,
      feedback: gradingData.feedback,
      filesReviewed,
      accessible,
      strengths: gradingData.strengths || [],
      improvements: gradingData.improvements || [],
      rubric_scores: gradingData.rubric_scores || {},
    };
  } catch (error) {
    console.error("AI Grading Error:", error);
    throw new ApiError(500, `Failed to grade submission: ${error.message}`);
  }
};

/**
 * Fetch submission content based on type
 */
async function fetchSubmissionContent(submissionLink, submissionType) {
  switch (submissionType) {
    case "github":
      return await fetchGithubContent(submissionLink);
    case "gdoc":
      return await fetchGoogleDocContent(submissionLink);
    case "notion":
      return await fetchNotionContent(submissionLink);
    case "figma":
      return await fetchFigmaContent(submissionLink);
    default:
      return { content: submissionLink, filesReviewed: [], accessible: true };
  }
}

/**
 * Helper function to get role-specific grading prompts
 */
function getRoleSpecificPrompt(roleSlug) {
  const rolePrompts = {
    "software-engineer": `- Strong focus on code quality, design patterns, and scalability
- API design and RESTful principles
- Database design and optimization
- Error handling and edge cases
- Testing and CI/CD awareness`,

    "product-manager": `- Market research and competitive analysis
- User research and requirements gathering
- Roadmap planning and prioritization
- Metrics and success criteria definition
- Stakeholder communication skills`,

    "data-analyst": `- SQL query optimization
- Data visualization and storytelling
- Statistical analysis and insights
- Data quality and validation
- Business impact and recommendations`,

    "ux-designer": `- User research and empathy
- Wireframing and prototyping
- Usability testing and iterations
- Design systems and consistency
- Accessibility considerations`,

    "business-analyst": `- Requirements gathering and analysis
- Process documentation
- Stakeholder management
- Risk assessment
- Solution architecture and recommendations`,

    "qa-engineer": `- Test planning and coverage
- Automation and manual testing
- Bug reporting and severity assessment
- Performance and load testing
- Regression and edge case testing`,
  };

  return rolePrompts[roleSlug] || "- Technical competency in the role\n- Problem-solving approach\n- Communication clarity";
}
