import { MongoClientInsertOne, MongoClientFind } from '@/helpers/mongo';
import { requireAuth } from '@/middleware/auth';
import { handleApiError } from '@/lib/errorHandler';
import { aiJSONPrompt } from '@/lib/ai';

// Joi schema for request validation
const feedbackSchema = {
    feedback_text: {
        type: 'string',
        required: true,
        min: 10,
        max: 2000,
        messages: {
            'string.empty': 'Feedback text is required',
            'string.min': 'Feedback must be at least 10 characters',
            'string.max': 'Feedback cannot exceed 2000 characters',
        },
    },
    rating: {
        type: 'number',
        min: 1,
        max: 5,
        integer: true,
        optional: true,
        messages: {
            'number.base': 'Rating must be a number',
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5',
            'number.integer': 'Rating must be a whole number',
        },
    },
    context: {
        type: 'object',
        optional: true,
        props: {
            path: { type: 'string', optional: true },
            ua: { type: 'string', optional: true },
        },
    },
};

/**
 * Create a structured feedback document
 */
function createFeedbackDoc(payload, auth, aiResult) {
    const now = new Date().toISOString();
    return {
        user_id: auth.userId,
        user_name: auth.userName || 'Unknown',
        source: 'app',
        feedback_text: payload.feedback_text,
        rating: payload.rating || null,
        context: {
            path: payload.context?.path || null,
            ua: payload.context?.ua || null,
        },
        ai: aiResult,
        created_on: now,
        updated_on: now,
    };
}


/**
 * Process feedback text with AI to extract structured data
 */
async function processFeedbackWithAI(feedbackText) {
    try {
        const prompt = `Analyze the following user feedback and extract structured information:

Feedback: "${feedbackText}"

Return a JSON object with these fields:
- summary: A brief 1-2 sentence summary of the feedback
- sentiment: One of "positive", "neutral", or "negative"
- topics: An array of relevant topics (e.g., ["performance", "ui", "feature-request"])
- priority: One of "low", "medium", or "high"
- action_items: An array of action items, each with title, owner, and eta_days
- raw_model_output: The complete raw response from the AI model

Example output:
{
  "summary": "User reported slow performance on the checkout page",
  "sentiment": "negative",
  "topics": ["performance", "checkout"],
  "priority": "high",
  "action_items": [
    {"title": "Optimize checkout page performance", "owner": "frontend", "eta_days": 7}
  ],
  "raw_model_output": "..."
}`;

        const result = await aiJSONPrompt(prompt, 'gemini-1.5-flash');

        // Ensure we have all required fields with fallbacks
        return {
            summary: result.summary || 'No summary generated',
            sentiment: ['positive', 'neutral', 'negative'].includes(result.sentiment?.toLowerCase())
                ? result.sentiment.toLowerCase()
                : 'neutral',
            topics: Array.isArray(result.topics) ? result.topics : [],
            priority: ['low', 'medium', 'high'].includes(result.priority?.toLowerCase())
                ? result.priority.toLowerCase()
                : 'medium',
            action_items: Array.isArray(result.action_items)
                ? result.action_items
                : [],
            raw_model_output: result.raw_model_output || JSON.stringify(result),
        };
    } catch (error) {
        console.error('AI processing failed:', error);
        // Return safe defaults if AI processing fails
        return {
            summary: 'Feedback processing failed',
            sentiment: 'neutral',
            topics: [],
            priority: 'medium',
            action_items: [],
            raw_model_output: `Error: ${error.message}`,
        };
    }
}

/**
 * Validate request payload against schema
 */
function validateFeedback(payload) {
    const errors = [];

    // Check required fields
    for (const [key, rule] of Object.entries(feedbackSchema)) {
        if (rule.required && (payload[key] === undefined || payload[key] === null)) {
            errors.push(rule.messages?.['any.required'] || `${key} is required`);
        }
    }

    // Type and format validation
    for (const [key, value] of Object.entries(payload)) {
        const rule = feedbackSchema[key];
        if (!rule) continue;

        // Type checking
        if (rule.type === 'number' && typeof value !== 'number') {
            errors.push(rule.messages?.['number.base'] || `${key} must be a number`);
        } else if (rule.type === 'string' && typeof value !== 'string') {
            errors.push(rule.messages?.['string.base'] || `${key} must be a string`);
        } else if (rule.type === 'object' && (typeof value !== 'object' || value === null)) {
            errors.push(rule.messages?.['object.base'] || `${key} must be an object`);
        }

        // Additional validations for strings
        if (rule.type === 'string' && typeof value === 'string') {
            if (rule.min && value.length < rule.min) {
                errors.push(rule.messages?.['string.min'] || `${key} must be at least ${rule.min} characters`);
            }
            if (rule.max && value.length > rule.max) {
                errors.push(rule.messages?.['string.max'] || `${key} cannot exceed ${rule.max} characters`);
            }
        }

        // Additional validations for numbers
        if (rule.type === 'number' && typeof value === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                errors.push(rule.messages?.['number.min'] || `${key} must be at least ${rule.min}`);
            }
            if (rule.max !== undefined && value > rule.max) {
                errors.push(rule.messages?.['number.max'] || `${key} cannot exceed ${rule.max}`);
            }
            if (rule.integer && !Number.isInteger(value)) {
                errors.push(rule.messages?.['number.integer'] || `${key} must be an integer`);
            }
        }
    }

    return errors;
}

/**
 * POST /api/feedback - Submit feedback
 */
export async function POST(req) {
    try {
        // 1. Authenticate user
        const auth = requireAuth(req); // Handles authentication and returns user data

        // 2. Parse and validate request body
        const payload = await req.json();
        const validationErrors = validateFeedback(payload); // Can be done using Joi or Zod validation
        if (validationErrors.length > 0) {
            return Response.json({ error: 'Validation failed', details: validationErrors }, { status: 400 });
        }

        // 3. Process feedback with AI
        const aiResult = await processFeedbackWithAI(payload.feedback_text);

        // 4. Prepare feedback document
        const feedbackDoc = createFeedbackDoc(payload, auth, aiResult);

        // 5. Save to database
        const { status: insertStatus } = await MongoClientInsertOne('feedback', feedbackDoc);

        if (!insertStatus) {
            throw new Error('Failed to save feedback');
        }

        // 6. Return success response
        return Response.json({ message: 'Feedback submitted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Error in POST /api/feedback:', error);
        return handleApiError(error, 'Failed to submit feedback'); // Standardized error handler
    }
}


/**
 * GET /api/feedback - Get user's feedback history (last 20 items)
 */
export async function GET(req) {
    try {
        // 1. Authenticate user
        const auth = requireAuth(req);

        // 2. Build query
        const query = { user_id: auth.userId };
        const options = {
            sort: { created_on: -1 }, // Most recent first
            limit: 20,
            projection: {
                _id: 1,
                feedback_text: 1,
                rating: 1,
                'ai.summary': 1,
                'ai.sentiment': 1,
                'ai.priority': 1,
                created_on: 1,
            },
        };

        // 3. Fetch feedback from database
        const { status, data: feedback } = await MongoClientFind(
            'feedback',
            query,
            options
        );

        if (!status) {
            throw new Error('Failed to fetch feedback');
        }

        // 4. Format response
        const formattedFeedback = feedback.map((item) => ({
            id: item._id.toString(),
            feedback_text: item.feedback_text,
            rating: item.rating,
            ai: item.ai ? {
                summary: item.ai.summary,
                sentiment: item.ai.sentiment,
                priority: item.ai.priority,
            } : null,
            created_on: item.created_on,
        }));

        // 5. Return response
        return Response.json(
            { feedback: formattedFeedback },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-store',
                },
            }
        );
    } catch (error) {
        console.error('Error in GET /api/feedback:', error);
        return handleApiError(error, 'Failed to fetch feedback');
    }
}
