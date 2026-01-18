from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database connection URL (defaults to localhost)
    mongodb_url: str = "mongodb://localhost:27017"
    
    # Name of the database to be created
    database_name: str = "network_generator_db"

    #Logging settings : INFO or DEBUG
    log_level: str = "INFO"

    class Config:
        # Specifies the environment file to load
        env_file = ".env"

# Instantiate the settings object for use in other files
settings = Settings()