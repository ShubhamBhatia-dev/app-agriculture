
INTRO_TEXT = "Hello! I am your farming assistant. I’ll give advice on crops, weather, pests, prices, and schemes."

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, ToolMessage
from langchain_core.tools import tool
import requests
from langchain.prompts import PromptTemplate
from pydantic import BaseModel, Field
from langchain.agents import create_react_agent, AgentExecutor
from langchain.agents import create_tool_calling_agent

from langchain import hub
from datetime import datetime
from langchain.prompts import PromptTemplate
from langchain.agents import AgentExecutor, create_react_agent
from langchain import hub # Make sure hub is imported
from langchain.schema import HumanMessage, SystemMessage

class GreetingCheckResult(BaseModel):
    is_greeting: bool


os.environ["GOOGLE_API_KEY"] = ""  # Replace with your real key
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")


import re
from langchain.schema import SystemMessage, HumanMessage

def strip_markdown(text: str) -> str:
    """Remove basic Markdown formatting and return plain text."""
    # Remove emphasis markers (*, _, **, __)
    text = re.sub(r'(\*\*|__)(.*?)\1', r'\2', text)  # bold
    text = re.sub(r'(\*|_)(.*?)\1', r'\2', text)     # italic
    # Remove inline code/backticks
    text = re.sub(r'`([^`]*)`', r'\1', text)
    # Remove headings
    text = re.sub(r'#+\s', '', text)
    # Remove links but keep link text
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove any remaining extra asterisks
    text = text.replace('*', '')
    return text.strip()

def get_confident_answer_string(incoming_msg: str, original_query: str) -> str:
    """
    Evaluates a bot's answer. If it's a low-confidence refusal, it
    returns a new, better answer. Otherwise, it returns the original answer string.
    Ensures final output is under 1000 characters and stripped of Markdown.
    """
    
    system_prompt = """
    You are an expert AI quality assurance system for a farming assistant bot.

    **CONTEXT:**
    - Farmer's Original Question: "{user_query}"
    - Primary AI's Answer: "{bot_answer}"

    **YOUR TASK:**
    Analyze the primary AI's answer to see if it's a "low-confidence refusal" (e.g., it says "I cannot help," "I don't have information," or is evasive).

    **YOUR RESPONSE RULES:**
    - **IF** the AI's answer is a low-confidence refusal, you MUST generate a new, helpful, and direct answer to the farmer's original question.
    - **ELSE IF** the AI's answer is confident and helpful, you MUST use the original answer.
    - Keep your answer under 1000 characters.

    **IMPORTANT: Your final output should be ONLY the text of the answer itself, with no introductions, explanations, or extra formatting.**
    """
    
    formatted_prompt = system_prompt.format(user_query=original_query, bot_answer=incoming_msg)

    messages = [
        SystemMessage(content=formatted_prompt),
        HumanMessage(content="Now, provide the direct answer string based on the rules.")
    ]
    
    try:
        response = llm.invoke(messages)
        final_answer = strip_markdown(response.content.strip())
        
        # Ensure under 1000 characters
        if len(final_answer) > 1000:
            final_answer = final_answer[:997] + "..."
        
        return final_answer
        
    except Exception as e:
        print(f"⚠️ LLM call failed: {e}. Falling back to the original message.")
        clean_msg = strip_markdown(incoming_msg)
        return clean_msg[:997] + "..." if len(clean_msg) > 1000 else clean_msg


def check_greeting(incoming_msg: str) -> bool:
    """
    Use Gemini model to detect if incoming_msg is a greeting or a request for help/problem.
    Returns True if it is a greeting or help request, False otherwise.
    """
    prompt = (
        "Determine if the following message is either a greeting "
        "or expresses that the user needs help or has a problem. "
        "Examples include: hi, hello, hey, good morning, can I help you, "
        "'I want help', 'I have a problem', etc.\n\n"
        f"Message: \"{incoming_msg}\"\n"
        "Answer with ONLY 'yes' if it is a greeting or help request, or 'no' if it is not."
    )

    response = llm.predict_messages([HumanMessage(content=prompt)])
    answer = response.content.strip().lower()

    return answer == 'yes'


class PINCODECheckResult(BaseModel):
    is_pincode: bool = Field(description="True if the message is about an Indian postal code, otherwise False")
    pincode: str = Field(description="The extracted 6-digit Indian pincode, or empty string if none found")


def check_pincode_intent(incoming_msg: str) -> PINCODECheckResult:
    """
    Uses the LLM to detect if `incoming_msg` is about providing or asking for a pincode (Indian postal code)
    and extracts the pincode if present.
    Returns a PINCODECheckResult object.
    """
    structured_model = llm.with_structured_output(PINCODECheckResult)

    prompt = (
        "Determine if the following message is related to an Indian pincode (postal code). "
        "Examples: 'My pin code is 110001', 'This is my pin code 560034', 'pincode 400001', "
        "'What is your pincode?'.\n\n"
        "If related, extract the 6-digit pincode if it exists in the message.\n"
        "If not related, set is_pincode to false and pincode to an empty string.\n"
        f"Message: \"{incoming_msg}\""
    )
    
    return structured_model.invoke(prompt)




from pydantic import BaseModel, Field

class AddressExtractionResult(BaseModel):
    is_address: bool = Field(description="True if the message contains an address or part of an address, otherwise False")
    state: str = Field(description="The state name from the address, or empty string if not present")
    district: str = Field(description="The district name from the address, or empty string if not present")
    city: str = Field(description="The city or town name from the address, or empty string if not present")
    village: str = Field(description="The village name from the address, or empty string if not present")


def extract_address_details(incoming_msg: str) -> AddressExtractionResult:
    """
    Uses the LLM to detect if `incoming_msg` contains an address
    and extracts components like state, district, city, village, and pincode.
    Returns an AddressExtractionResult object.
    """
    structured_model = llm.with_structured_output(AddressExtractionResult)

    prompt = (
        "Determine if the following message contains an address or part of an address. "
        "If it does, extract the state, district, city, village, and pincode (6-digit). "
        "If a specific component is missing, return it as an empty string. "
        "If it's not an address, set is_address to false and all fields to empty strings.\n"
        f"Message: \"{incoming_msg}\""
    )

    return structured_model.invoke(prompt)


from pydantic import BaseModel, Field

class FarmingQuery(BaseModel):
    """A model to hold structured information about a farmer's query."""
    is_query: bool = Field(description="True if the message is an agricultural question or problem, otherwise False.")
    query_summary: str = Field(description="A brief summary of the farmer's query, or an empty string.")
    query_type: str = Field(description="The category of the query, e.g., 'pest', 'disease', 'crop_selection', 'yield_improvement', 'loan', 'weather', 'other'.")

def analyze_farmer_query(incoming_msg: str) -> FarmingQuery:
    """
    Uses an LLM to analyze a farmer's message, determine if it's a valid query
    (either a problem or a request for advice), and categorizes it.
    """
    # Make sure your `llm` variable is defined (e.g., ChatGoogleGenerativeAI)
    structured_model = llm.with_structured_output(FarmingQuery)

    # The new, improved prompt with instructions and examples
    prompt = f"""
You are an expert agricultural assistant. Your task is to analyze a user's message and classify their query. A "query" can be a report of a problem OR a request for advice.

**Instructions:**
1.  If the message is a question or a statement about farming, set `is_query` to `true`.
2.  Summarize the user's need in the `query_summary`.
3.  Categorize the query into one of these types:  'disease', 'crop_selection', 'yield_improvement', 'loan', 'weather', 'other' 'crop_price'.
4.  If the message is just a greeting or unrelated, set `is_query` to `false`.

**Examples:**

* **User Message:** "The leaves on my wheat are covered in yellow rust."
* **Correct Output:** {{"is_query": true, "query_summary": "User's wheat has yellow rust on leaves.", "query_type": "disease"}}

* **User Message:** "which type of crop should i plough in my field so that my production goes high"
* **Correct Output:** {{"is_query": true, "query_summary": "Wants advice on which crop to plant for high production.", "query_type": "crop_selection"}}

* **User Message:** "how can I get a better harvest from my small farm?"
* **Correct Output:** {{"is_query": true, "query_summary": "Seeking advice for improving harvest yield on a small farm.", "query_type": "yield_improvement"}}

* **User Message:** "hello good morning"
* **Correct Output:** {{"is_query": false, "query_summary": "", "query_type": ""}}

---
**Now, analyze this message from the user.**

**User Message:** "{incoming_msg}"
"""

    return structured_model.invoke(prompt)




@tool
def get_daily_weather_forecast(latitude: float, longitude: float, days: int) -> str:
    """
    Gets the daily weather forecast for a given latitude and longitude for a specified number of days.
    Returns the forecast as a formatted string. Cannot forecast more than 10 days.
    """
    API_KEY = "" # Replace with your key
    if not API_KEY or "YOUR_GOOGLE_API_KEY" in API_KEY:
        return "Error: API Key is not configured."
    
    url = "https://weather.googleapis.com/v1/forecast/days:lookup"
    params = {"key": API_KEY, "location.latitude": latitude, "location.longitude": longitude, "days": days}

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        forecast_days = data.get("forecastDays", [])
        if not forecast_days:
            return "Could not retrieve forecast data."

        output_string = ""
        for day in forecast_days:
            date_obj = datetime.fromisoformat(day["interval"]["startTime"].replace("Z", "+00:00"))
            formatted_date = date_obj.strftime('%A, %b %d')
            max_temp = day.get("maxTemperature", {}).get("degrees", "N/A")
            min_temp = day.get("minTemperature", {}).get("degrees", "N/A")
            description = day.get("daytimeForecast", {}).get("weatherCondition", {}).get("description", {}).get("text", "N/A")
            output_string += f"📅 {formatted_date}: 🌡️ {min_temp}°C / {max_temp}°C, ☀️ {description}\n"
        
        return output_string.strip()
    except Exception as e:
        return f"An error occurred while fetching weather: {e}"

def get_weather_forecast_for_user(user_query: str, lat: float, lng: float):
    """Creates and runs a more reliable tool-calling agent."""
    print(f"\n--- Running agent for query: '{user_query}' ---")
    
    tools = [get_daily_weather_forecast]
    # Use a model that is good at tool calling, like gemini-pro
    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
    
    # --- FIX: Use a prompt designed for tool calling ---
    # This prompt helps the LLM format its output correctly.
    prompt = hub.pull("hwchase17/openai-tools-agent")
    
    # --- FIX: Use the create_tool_calling_agent constructor ---
    agent = create_tool_calling_agent(llm, tools, prompt)
    
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        handle_parsing_errors=True # Good practice to include this
    )
    
    # --- FIX: Simplify the input ---
    # We provide the context (lat/lng) directly in the prompt for the LLM to use.
    # The agent will figure out how to call the tool from this combined input.
    response = agent_executor.invoke({
        "input": f"User's question: '{user_query}'. The user's current location is latitude={lat}, longitude={lng}."
    })
    
    return response["output"]