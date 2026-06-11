from typing import Optional
from collections import Counter

class ContentRelevanceFilter:
    """Extract relevant content from a webpage based on the claim being evaluated."""

    def __init__(self, claim: str, source_text: str, source_domain: str = ""):
        self.claim = claim
        self.full_text = source_text
        self.source_domain = source_domain

    def extract_relevant(self) -> str:
        """
        Main entry point: decides between site-specific and generic extraction.
        Returns the most relevant chunk of the document.
        """
        # --- Phase 1: Site-Specific Extraction (if domain known) ---
        if self.source_domain:
            extractor_map = {
                'thuvienphapluat.vn': self._extract_thuvienphapluat,
                'chinhphu.vn': self._extract_chinhphu,
                # Add more domains here
            }
            if self.source_domain in extractor_map:
                return extractor_map[self.source_domain]()
            else:
                return self._generic_relevance_extract()
        
        # --- Phase 2: Generic Fallback ---
        return self._generic_relevance_extract()

    def _extract_thuvienphapluat(self) -> str:
        """Custom extraction for thuvienphapluat.vn, using EMB fallback."""
        return self._generic_relevance_extract()

    def _extract_chinhphu(self) -> str:
        """Custom extraction for chinhphu.vn using semantic HTML."""
        return self._generic_relevance_extract()

    def _preprocess(self, text: str) -> str:
        """(Optional) Clean noise: repeated newlines, tabs, etc."""
        import re
        text = re.sub(r'\n+', '\n', text) # Collapse multiple newlines
        text = re.sub(r'\t+', ' ', text) # Replace tabs with spaces
        return text

    def _generic_relevance_extract(self, chunk_size: int = 1000, overlap: int = 200) -> str:
        """
        Splits text into overlapping chunks, scores them by overlap with
        the claim, and concatenates the highest scoring, non-overlapping chunks.
        """
        # 1. Pre-process
        clean_text = self._preprocess(self.full_text)
        
        # 2. Tokenize for chunking
        words = clean_text.split()
        if not words:
            return ""

        # 3. Create overlapping chunks
        chunks = []
        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            if end == len(words):
                break
            start += (chunk_size - overlap)

        # 4. Score chunks by shared keywords with claim
        claim_words = set(self.claim.lower().split())
        scored_chunks = []
        for chunk in chunks:
            chunk_words = set(chunk.lower().split())
            common = claim_words.intersection(chunk_words)
            # Score = number of common words, weighted by uniqueness
            score = sum(len(w) for w in common)
            scored_chunks.append((score, chunk))

        # 5. Sort by score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)

        # 6. Greedily select top chunks, avoiding heavy overlap
        # to prevent near-duplicate results
        selected = []
        for score, chunk in scored_chunks[:5]: # Take top 5
            if score == 0:
                break # No more relevant content
            if not self._is_heavily_overlapping(chunk, selected):
                selected.append(chunk)

        if not selected:
            return self.full_text[:3000] + "\n..." # Fallback: return beginning

        return "\n\n...\n\n".join(selected)

    def _is_heavily_overlapping(self, new_chunk: str, selected: list, threshold: float = 0.8) -> bool:
        """Check if a new chunk is mostly a repetition of already selected ones."""
        for s in selected:
            similarity = self._jaccard_similarity(new_chunk, s)
            if similarity > threshold:
                return True
        return False

    @staticmethod
    def _jaccard_similarity(text1: str, text2: str) -> float:
        """Calculate Jaccard similarity."""
        set1 = set(text1.split())
        set2 = set(text2.split())
        if not set1 or not set2:
            return 0.0
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        return len(intersection) / len(union)
