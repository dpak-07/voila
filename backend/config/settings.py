from pydantic import BaseSettings

class Settings(BaseSettings):
    app_name: str = 'Voila Backend'
    debug: bool = True
    database_file: str = 'database/sample_data.json'
    model_folder: str = 'model'
    auth_secret: str = 'secret-key'

    class Config:
        env_file = '.env'

settings = Settings()
