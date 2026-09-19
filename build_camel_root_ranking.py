"""
Optional re-ranker for the 200 root families.

This script is deliberately separate from the book data. When you have the CAMeL
MSA frequency release locally and CAMeL Tools installed, it can aggregate surface
frequency by analyzed root and produce a root-frequency table for curation.

Requirements:
    pip install camel-tools
    camel_data -i light

Input:
    MSA_freq_lists.tsv   (CAMeL-Lab/Camel_Arabic_Frequency_Lists release)

The book should still be manually reviewed: an undiacritized frequency list is
morphologically ambiguous, and weak roots can require normalization.
"""
import argparse, csv, math
from collections import defaultdict
from camel_tools.disambig.mle import MLEDisambiguator

def main():
    p=argparse.ArgumentParser()
    p.add_argument("msa_tsv")
    p.add_argument("--types",type=int,default=250000)
    p.add_argument("--out",default="camel_root_ranking.csv")
    a=p.parse_args()

    disambig=MLEDisambiguator.pretrained("calima-msa-r13",top=1,cache_size=250000)
    freq=defaultdict(int); lemmas=defaultdict(set)

    with open(a.msa_tsv,encoding="utf-8") as f:
        for i,row in enumerate(csv.reader(f,delimiter="\t")):
            if i>=a.types: break
            if len(row)<2: continue
            word,n=row[0],int(row[1])
            d=disambig.disambiguate([word])[0]
            if not d.analyses: continue
            an=d.analyses[0].analysis
            root=an.get("root"); lemma=an.get("lex")
            if not root or root in {"0","NO_ROOT"}: continue
            freq[root]+=n
            if lemma: lemmas[root].add(lemma)

    rows=[]
    for root,n in freq.items():
        family=len(lemmas[root])
        score=math.log1p(n)+0.55*math.log1p(family)
        rows.append((score,root,n,family))
    rows.sort(reverse=True)

    with open(a.out,"w",encoding="utf-8",newline="") as f:
        w=csv.writer(f);w.writerow(["rank","root","learner_score","token_mass","lemma_family_size"])
        for i,(score,root,n,family) in enumerate(rows,1):
            w.writerow([i,root,f"{score:.5f}",n,family])

if __name__=="__main__":
    main()
