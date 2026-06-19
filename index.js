import asyncio
import aiohttp 
import logging
from logging.handlers import RotatingFileHandler
import re
import discord  # The main discord library.
from discord.ext import commands  # Importing the commands framework from discord.ext.
from discord.ext import tasks
from discord import Embed
from discord import Guild, Member, VoiceState
import os  # Used for accessing environment variables.
from dotenv import load_dotenv  # To load environment variables from a .env file.
from userManager import UserManager # Custom module for managing user data

# Jialuo Zou
# version 1.11.7

# Create a bot instance with a command prefix, default intents
intents = discord.Intents.default()
intents.messages = True
intents.members = True  # Enable Server Members Intent
intents.message_content = True  # Enable message_content intent
bot = commands.Bot(command_prefix='$', intents=intents, case_insensitive=True)

# Set up
load_dotenv('token.env')  # Load the bot's token from a .env file 
token = os.getenv('TOKEN')

# Create a logger
logger = logging.getLogger("Kay/O")
logger.setLevel(logging.INFO)  # Adjust the logging level as needed

# Define log file rotation policy
handler = RotatingFileHandler(
        filename='my_log.log',  # Name of the log file
        mode='a',               # Append mode
        maxBytes=7*1024*1024,   # 7 MB
        backupCount=5,          # Keep up to 5 backup files
        encoding='utf-8',       # Ensure text is encoded properly
        delay=False
    )

# Create formatter and add it to the handler
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)

# Add the handler to the logger
logger.addHandler(handler)

# Variables
voice_state_dict = {}  # To keep track of members' time in voice channels


# Event listener for when the bot has switched from offline to online.
@bot.event
async def on_ready():
  if not save_voice_state_task.is_running():
    save_voice_state_task.start() # Start the save voice state task if it's not already running

  logger.info(f'Service Online, Bot Name {bot.user.name} (ID: {bot.user.id})') # Log bot's online status
  print(f'Service Online, Bot Name {bot.user.name} (ID: {bot.user.id})'# Also print to console for direct feedback
        )  # Welcome sentence in terminal.
  print('------')

  url = "https://discord.com/api/v9/gateway/bot" 
  response = await fetch_discord_resource(url, token) # request the resource info of bot
  logger.info(f'discord resource recieved: {response}') # Log the resource fetch info
  print(f'discord resource recieved: {response}') # Print to console as well

  # Log a message indicating that the bot is adding current voice channel members to tracking
  logger.info('Adding members already in voice channels to voice_state_dict')
  current_time = asyncio.get_event_loop().time() # Get the current time from the asyncio event loop

  for guild in bot.guilds: # Iterate over each guild the bot is a member of
    # This bot was intent to maintain data for several server, but the upgrade will be done in future
    for vc in guild.voice_channels: # Iterate over each voice channel in the guild
      for member in vc.members: # Iterate over each member currently in the voice channel
        if str(guild.id) not in voice_state_dict: # Check if the guild ID is already a key in the voice_state_dict dictionary
          voice_state_dict[str(guild.id)] = {}  # If not, initialize a new dictionary for this guild
        voice_state_dict[str(guild.id)][str(member.id)] = current_time # Add the member ID and the current time to the guild's entry in the dictionary


@bot.event
async def on_message(message):
  # If the author of the message is the bot itself, ignore the message
  if message.author == bot.user:
    return

  if bot.user in message.mentions:   # Check if the bot was @ed
    response = "What's the plan, send the robot in first? Smart choice."
    await message.channel.send(response) # Send the crafted response to the channel where the mention occurred

  # Process commands if there are any
  await bot.process_commands(message) # Continue to process commands if any are present in the message


async def update_member_points(member: Member, guild: Guild, time_spent: float):
  if member.bot:  # If the member is a bot
    return  # Ignore and return immediately
  points = time_spent // 60  # We give 1 point for every minute in the voice channel
  user_id = str(
      member.id
  )  # Convert the member id to a string to use as a dictionary key
  guild_id = str(guild.id)
  userData = UserManager.load_data()

  # If the guild is not in userData yet, add it
  if guild_id not in userData:
    userData[guild_id] = {}

  # If the user is not in the userData of the guild yet, add them
  if user_id not in userData[guild_id]:
    userData[guild_id][user_id] = {
        "username": member.name,
        "warns": 0, # This was meant for some other featrues, but was kept for future update
        "points": 0.0 # With a .0 to show accuracy on visual
    }

  # Add the points to the user's total
  userData[guild_id][user_id]["points"] += points

  # Save the points to the file
  UserManager.save_data(userData)


@bot.event
async def on_voice_state_update(member, before: VoiceState, after: VoiceState):
  # Ensure this is for non-bot members only
  if member.bot:
    return
  
  # Since this trigger happens even if member mute themself or other simple action we dont care about
  # We check if the 'position' of the user changes
  if before.channel == after.channel:
    return 

  # Define guild_id based on the current state
  if before.channel is None:
    # Voice Channel ID
    guild_id = str(
        after.channel.guild.id)  # We get the guild id from the after channel
  else:
    guild_id = str(before.channel.guild.id)  # We get the guild id from the before channel

  if guild_id not in voice_state_dict: # Create a new section of the guild_id that was not in the data
    voice_state_dict[guild_id] = {}

  member_id = str(member.id)  # Convert the member id to a string to use as a dictionary key

  # The member has joined a voice channel (from no channel)
  if before.channel is None and after.channel is not None:
    logger.info(f'Voice state update: Member={member}, Before={before}, After={after}') # Log update
    voice_state_dict[guild_id][member_id] = asyncio.get_event_loop().time()  # Store the current time

  # The member has left a voice channel (to no channel)
  if before.channel is not None and after.channel is None and voice_state_dict[guild_id][member_id] is not None:
    logger.info(f'Voice state update: Member={member}, Before={before}, After={after}') # Log update
    time_spent = asyncio.get_event_loop().time() - voice_state_dict[guild_id][member_id]  # Calculate time spent in voice channel
    del voice_state_dict[guild_id][member_id]  # Remove the member's id from the dict as they're no longer in a voice channel
    guild = before.channel.guild
    
    await update_member_points(member, guild, time_spent) # Process the point update function

  else:
    logger.info(f'Voice state update: Member={member}, Before={before}, After={after}') # Log update


@bot.command(name='savept')
async def savepoints(ctx):
  # Log the action of manually saving points
  logger.info('Manually saving points for members still in voice channels')
  current_time = asyncio.get_event_loop().time() # Get the current time from the asyncio loop

  # Iterate over each guild where the bot is present
  for guild in bot.guilds:
    guild_id = str(guild.id) # Convert guild ID to string for use as dictionary key
    for vc in guild.voice_channels: # Iterate over each member in the voice channel
      for member in vc.members:
        member_id = str(member.id) # Convert member ID to string for dictionary key
        if guild_id not in voice_state_dict: # Check if the guild is not already in the dictionary, add if missing
          voice_state_dict[guild_id] = {}
        if member_id not in voice_state_dict[guild_id]:  # Ensure member is added if missing
          voice_state_dict[guild_id][member_id] = current_time  # Assume they joined now for simplicity
        # Now calculate time spent and update points as before
        time_spent = current_time - voice_state_dict[guild_id][member_id]
        await update_member_points(member, guild, time_spent)
        voice_state_dict[guild_id][
            member_id] = current_time  # Reset their start time to now
  embedsv = discord.Embed(title="Processing",description=f"Data manually stored to the Database")
  await ctx.send(embed=embedsv) # Send the embed message to the context channel

@tasks.loop(hours=1)
async def save_voice_state_task():
  # Log that the hourly update task is running
  logger.info('Running hourly task to update points for members still in voice channels')
  current_time = asyncio.get_event_loop().time() # Capture the current time at the start of the task

  # Iterate over each guild and its members in the voice_state_dict
  for guild_id, members in voice_state_dict.items():
    guild = bot.get_guild(
        int(guild_id))  # Get the Guild object using the guild id
    if guild is None:
      continue  # If the guild couldn't be found, skip it
    for member_id in list(members.keys()):
      member = guild.get_member(
          int(member_id))  # Get the Member object using the member id
      if member and member_id in voice_state_dict[guild_id]:
        time_spent = current_time - voice_state_dict[guild_id][member_id]
        await update_member_points(member, guild, time_spent)

  # Update the start times for all members still in voice channels to the current time
  for guild_id, members in voice_state_dict.items():
    for member_id in members.keys():
      voice_state_dict[guild_id][member_id] = current_time


@bot.command(name='myPoints')
async def check_points(ctx, member: discord.Member = None):
  # If no member is mentioned, check the points of the author of the command
  if member is None:
    member = ctx.author

  # Load points from the JSON file
  userData = UserManager.load_data()
  user_id = str(member.id)
  guild_id = str(ctx.guild.id)

  points = userData[guild_id]

  # Create a list of tuples, each containing the user_id and their points
  points_list = [(user_id, data['points']) for user_id, data in points.items()]
  # Sort the list in descending order
  sorted_points_list = sorted(points_list, key=lambda x: x[1], reverse=True)

  # Check if the user has any points
  if user_id in points:
    points_count = points[user_id]['points']
    rank = sorted_points_list.index((user_id, points_count)) + 1  # Adding 1 because index is 0-based

    # Create an embed message
    embedPoints = discord.Embed(title="Vc time", color=0xFFD700)  # Gold color for points
    embedPoints.set_thumbnail(url=member.avatar.url)  # Set the member's profile picture as the thumbnail
    embedPoints.add_field(name=f"{member.name}'s Current Vc time",value=f"{points_count}Minutes.",inline=False)
    embedPoints.add_field(name=f"{member.name}'s Rank",value=f"Rank {rank}.",inline=False)
  else:
    # User has no points
    embedPoints = discord.Embed(title="Vc time",color=0x808080)  # Gray color for no points
    embedPoints.set_thumbnail(url=member.avatar.url)  # Set the member's profile picture as the thumbnail
    embedPoints.add_field(name=f"{member.name}'s Current Vc time",value="None",inline=False)
    embedPoints.add_field(name=f"{member.name}'s Rank",value=f"No Rank",inline=False)
    embedPoints.add_field(name="\u200b",value=f"{member.name}, you can stay in the vc to gain Vc time",inline=False)

  # Send the embed message
  await ctx.send(embed=embedPoints)


@bot.command(name='ldPoints')
async def leaderboard(ctx):
  # Load points from the JSON file
  userData = UserManager.load_data()
  guild_id = str(ctx.guild.id)

  points = userData[guild_id]
  # Create a list of tuples, each containing the user_id, username and their points
  points_list = [(user_id, data['username'], data['points'])
                 for user_id, data in points.items()]
  # Sort the list in descending order by points
  sorted_points_list = sorted(points_list, key=lambda x: x[2], reverse=True)

  # Get the top 10 users
  top_10_users = sorted_points_list[:10]

  # Create an embed message for the leaderboard
  embedLeaderboard = discord.Embed(title="Discord Vc time ranking",description="Only first ten are shown",color=0xFFD700)  # Gold color for points
  for i, user in enumerate(top_10_users):
    # Adding 1 to i because index is 0-based
    embedLeaderboard.add_field(name=f"{i+1}. {user[1]}",value=f"{user[2]} points",inline=False)

  # Send the embed message
  await ctx.send(embed=embedLeaderboard)

@bot.command(name='checkActions')
async def check_actions(ctx):
    # Get the member who invoked the command
    member = ctx.author
    # Check if the member is in a voice channel; if not, send a message and return
    if not member.voice or not member.voice.channel:
      await ctx.send("You are not in a voice channel.")
      return
    
    # Get the name of the voice channel the member is currently in
    channel_name = member.voice.channel.name
    # Fetch the recent actions from the log based on the voice channel name
    actions = get_channel_actions_from_log(channel_name)
    
    # If there are recent actions, create an embed to display them
    if actions:
      embed = Embed(title=f"Recent actions in {channel_name}", description="Here are the most recent actions in your channel (Up to 10):", color=0x00ff00)
                      
      # Add each action as a field in the embed                
      for action in actions:
        parts = action.split(": ")
        timestamp, action_details = parts[0], ": ".join(parts[1:])
        embed.add_field(name=timestamp, value=action_details, inline=False)
        
      # Use the `url` property of the avatar `Asset` object directly
      avatar_url = member.avatar.url if member.avatar else None

      # Create the footer text using the display name of the member who requested the action
      footer_text = f"Requested by {member.display_name}"
      if avatar_url: # Check if the member has an avatar URL available
        # If the avatar URL is available, set the embed footer with both the text and the member's avatar
        embed.set_footer(text=footer_text, icon_url=avatar_url)
      else:
        # If no avatar URL is available, set the embed footer with just the text
        embed.set_footer(text=footer_text)
        
      await ctx.send(embed=embed) # Send the embed to the context's channel
    else:
      await ctx.send("No recent actions found for your channel.") # If no actions were found, inform the member
 
def get_channel_actions_from_log(channel_name):
    actions = []
    # Adjust the regex pattern to capture the necessary parts of the log entry
    pattern = re.compile(
        r"(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d{3} - Kay/O - INFO - Voice state update: Member=(.*), Before=<VoiceState.*? channel=(None|<VoiceChannel id=\d+ name='([^']*)'.*?>)>, After=<VoiceState.*? channel=(None|<VoiceChannel id=\d+ name='([^']*)'.*?>>)"
    )

    # Open the log file and search for entries matching the pattern
    with open('my_log.log', 'r', encoding='utf-8') as log_file:
        for line in log_file:
            match = pattern.search(line)
            if match:
                # Extract relevant details from the log entry
                timestamp, member_name, before_channel, before_channel_name, after_channel, after_channel_name = match.groups()
                # Determine if the channel name matches and infer action
                if (after_channel_name == channel_name):
                    action = "joined"
                    actions.append(f"{timestamp}: {member_name} has {action} the channel.")
                elif (before_channel_name == channel_name):
                    action = "left"
                    actions.append(f"{timestamp}: {member_name} has {action} the channel.")

    return actions[-10:]  # Return the last 10 actions

async def fetch_discord_resource(url, token):
    # Define headers for the HTTP request including authorization token and user agent
    headers = {
        'Authorization': f'Bot {token}',
        'User-Agent': 'DiscordBot (https://discord.com/oauth2/authorize?client_id=1221603353948328086, v1.11.7)',
    }
    try:
        # Use aiohttp to make an asynchronous HTTP GET request
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 429: # Check if the request is rate limited
                    retry_after = float(response.headers.get('Retry-After', 1)) # Extract the retry-after delay
                    logger.warning(f"Rate limited. Retrying after {retry_after} seconds.")
                    await asyncio.sleep(retry_after) # Sleep for the duration of the rate limit
                    return await fetch_discord_resource(url, token)  # Recursive retry
                elif response.status != 200:
                    logger.error(f"Failed to fetch resource: {response.status}")  # Log if the request failed
                    return None
                # If the request was successful, return the JSON response
                return await response.json()
    except Exception as e:
        logger.error(f"An error occurred: {e}") # Log any exceptions that occur during the request
        return None

def main():
  # Start the bot using the provided token
  bot.run(token)  

if __name__ == '__main__':
  main()
