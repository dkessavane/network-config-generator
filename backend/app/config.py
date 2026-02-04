from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # New V2 syntax for configuration
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database connection URL (defaults to localhost)
    mongodb_url: str = "mongodb://localhost:27017"
    
    # Name of the database to be created
    database_name: str = "network_generator_db"

    # Logging settings: INFO or DEBUG
    log_level: str = "INFO"

# Instantiate the settings object for use in other files
settings = Settings()