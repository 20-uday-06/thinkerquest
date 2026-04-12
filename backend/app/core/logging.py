import logging


def configure_logging(level: str) -> None:
    """Configure global logging once for the service."""

    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
