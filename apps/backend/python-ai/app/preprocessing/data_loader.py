"""
Data loading and preprocessing for phishing detection.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
from sklearn.model_selection import train_test_split
import logging

logger = logging.getLogger(__name__)


class PhishingDataLoader:
    """Load and preprocess phishing detection datasets."""

    def __init__(self, data_path: Optional[Path] = None):
        """
        Initialize data loader.

        Args:
            data_path: Path to dataset CSV file. If None, uses sample data.
        """
        if data_path is None:
            # Use sample data from repository
            self.data_path = Path(__file__).parent.parent.parent.parent.parent / \
                           "datasets" / "phishing" / "sample" / "phishing_urls_sample.csv"
        else:
            self.data_path = Path(data_path)

    def load_raw_data(self) -> pd.DataFrame:
        """
        Load raw dataset from CSV.

        Returns:
            DataFrame with columns: url, label

        Raises:
            FileNotFoundError: If dataset file doesn't exist
        """
        if not self.data_path.exists():
            raise FileNotFoundError(
                f"Dataset not found at {self.data_path}. "
                f"Please download from Kaggle or use sample data."
            )

        logger.info(f"Loading data from {self.data_path}")
        df = pd.read_csv(self.data_path)

        # Validate required columns
        required_cols = ['url', 'label']
        if not all(col in df.columns for col in required_cols):
            raise ValueError(f"Dataset must contain columns: {required_cols}")

        logger.info(f"Loaded {len(df)} URLs")
        return df

    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and normalize the dataset.

        Args:
            df: Raw dataframe

        Returns:
            Cleaned dataframe
        """
        logger.info("Cleaning data...")

        # Remove duplicates
        original_size = len(df)
        df = df.drop_duplicates(subset=['url'])
        logger.info(f"Removed {original_size - len(df)} duplicate URLs")

        # Remove null values
        df = df.dropna(subset=['url', 'label'])

        # Normalize URLs
        df['url'] = df['url'].str.strip()
        df['url'] = df['url'].str.lower()

        # Normalize labels
        df['label'] = df['label'].map({
            'bad': 1,
            'phishing': 1,
            'malicious': 1,
            'good': 0,
            'legitimate': 0,
            'safe': 0
        })

        # Remove any rows where label mapping failed
        df = df.dropna(subset=['label'])
        df['label'] = df['label'].astype(int)

        # Remove invalid URLs (too short, missing protocol, etc.)
        df = df[df['url'].str.len() > 10]

        logger.info(f"Cleaned dataset size: {len(df)} URLs")
        logger.info(f"Class distribution:\n{df['label'].value_counts()}")

        return df

    def split_data(
        self,
        df: pd.DataFrame,
        test_size: float = 0.15,
        val_size: float = 0.15,
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """
        Split data into train, validation, and test sets.

        Args:
            df: Cleaned dataframe
            test_size: Proportion for test set
            val_size: Proportion for validation set (from remaining after test)
            random_state: Random seed for reproducibility

        Returns:
            Tuple of (train_df, val_df, test_df)
        """
        logger.info("Splitting data...")

        # First split: separate test set
        train_val, test = train_test_split(
            df,
            test_size=test_size,
            random_state=random_state,
            stratify=df['label']
        )

        # Second split: separate validation from training
        val_size_adjusted = val_size / (1 - test_size)
        train, val = train_test_split(
            train_val,
            test_size=val_size_adjusted,
            random_state=random_state,
            stratify=train_val['label']
        )

        logger.info(f"Train set: {len(train)} URLs ({len(train)/len(df)*100:.1f}%)")
        logger.info(f"Val set: {len(val)} URLs ({len(val)/len(df)*100:.1f}%)")
        logger.info(f"Test set: {len(test)} URLs ({len(test)/len(df)*100:.1f}%)")

        return train, val, test

    def get_class_weights(self, df: pd.DataFrame) -> dict:
        """
        Calculate class weights for imbalanced datasets.

        Args:
            df: Dataframe with 'label' column

        Returns:
            Dictionary of class weights
        """
        class_counts = df['label'].value_counts()
        total = len(df)

        weights = {
            0: total / (2 * class_counts[0]),
            1: total / (2 * class_counts[1])
        }

        logger.info(f"Class weights: {weights}")
        return weights

    def load_and_prepare(
        self,
        test_size: float = 0.15,
        val_size: float = 0.15,
        random_state: int = 42
    ) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict]:
        """
        Complete pipeline: load, clean, and split data.

        Args:
            test_size: Proportion for test set
            val_size: Proportion for validation set
            random_state: Random seed

        Returns:
            Tuple of (train_df, val_df, test_df, class_weights)
        """
        # Load raw data
        df = self.load_raw_data()

        # Clean data
        df = self.clean_data(df)

        # Split data
        train, val, test = self.split_data(df, test_size, val_size, random_state)

        # Calculate class weights
        class_weights = self.get_class_weights(train)

        return train, val, test, class_weights


def main():
    """Example usage."""
    logging.basicConfig(level=logging.INFO)

    loader = PhishingDataLoader()
    train, val, test, weights = loader.load_and_prepare()

    print("\n=== Dataset Summary ===")
    print(f"Training: {len(train)} samples")
    print(f"Validation: {len(val)} samples")
    print(f"Test: {len(test)} samples")
    print(f"\nClass weights: {weights}")


if __name__ == "__main__":
    main()
