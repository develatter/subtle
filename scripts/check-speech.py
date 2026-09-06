"""Regression tests for uncertain timing recovery. No model download needed."""
import unittest
from transcribe import clamp_to_duration, normalize_words

class TimingTests(unittest.TestCase):
    def test_zero_duration_keeps_text_and_marks_both_affected_words(self):
        words=normalize_words([{'word':'Las','start':0,'end':0},{'word':'ideas','start':0,'end':1},{'word':'cuentan','start':1.4,'end':2}])
        self.assertEqual([w['word'] for w in words],['Las','ideas','cuentan'])
        self.assertEqual([w['review'] for w in words],[True,True,False])
        self.assertEqual(words[0]['end'],words[1]['start'])
        self.assertEqual(words[2]['start'],1.4)
    def test_consecutive_instant_words_are_retained_and_flagged(self):
        words=normalize_words([{'word':'API','start':1,'end':1},{'word':'de','start':1,'end':1},{'word':'Google','start':1,'end':2}])
        self.assertEqual(len(words),3)
        self.assertTrue(all(w['review'] and w['end']>w['start'] for w in words))
        self.assertEqual(words[-1]['end'],2)
    def test_overlap_is_local_and_flagged(self):
        words=normalize_words([{'word':'uno','start':0,'end':1},{'word':'dos','start':.8,'end':1.8},{'word':'tres','start':2,'end':3}])
        self.assertEqual(words[0]['end'],words[1]['start'])
        self.assertTrue(words[0]['review'])
        self.assertEqual(words[2]['start'],2)
    def test_invalid_numbers_fail_without_silent_drop(self):
        with self.assertRaises(ValueError):normalize_words([{'word':'hola','start':float('nan'),'end':1}])
    def test_reliable_words_stay_unchanged(self):
        raw=[{'word':'uno','start':0,'end':.2},{'word':'dos','start':.4,'end':1}]
        self.assertEqual(normalize_words(raw),[{**w,'review':False} for w in raw])

    def test_words_never_exceed_the_audio_duration(self):
        words=clamp_to_duration([{'word':'a','start':0,'end':1,'review':False},{'word':'b','start':1,'end':2.5,'review':False},{'word':'c','start':2.6,'end':3,'review':False}],2.2)
        self.assertEqual([(w['word'],w['end'],w['review']) for w in words],[('a',1,False),('b',2.2,True)])
        self.assertEqual(clamp_to_duration([{'word':'a','start':0,'end':1,'review':False}],None)[0]['end'],1)

if __name__=='__main__':unittest.main()
