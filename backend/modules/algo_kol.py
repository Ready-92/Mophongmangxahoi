import collections

def find_top_influencer(edges):
    if not edges: return None, 0

    degree_count = collections.defaultdict(int)
    for edge in edges:
        degree_count[edge['from']] += 1
        degree_count[edge['to']] += 1
    
    if not degree_count: return None, 0

    best_id = max(degree_count, key=degree_count.get)
    return best_id, degree_count[best_id]