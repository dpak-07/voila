from pydantic import BaseModel, ConfigDict


class BedrockResponseModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    text: str
    model_id: str
    used_mock: bool
