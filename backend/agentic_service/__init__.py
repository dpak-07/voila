def __getattr__(name: str):
    if name == "AgenticService":
        from .agent import AgenticService
        return AgenticService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = ["AgenticService"]

