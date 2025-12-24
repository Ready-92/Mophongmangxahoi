def find_weak_connections(target_id, nodes, adjacency_map, current_visible_ids):
    target_node = next((n for n in nodes if n['id'] == target_id), None)
    if not target_node: return []
    
    source_traits = set(target_node.get('traits', []))
    strong_neighbors = adjacency_map.get(target_id, set())
    visible_set = set(current_visible_ids)
    
    weak_connections = []
    
    for node in nodes:
        nid = node['id']
        if nid == target_id: continue
        if nid in strong_neighbors: continue
        if nid not in visible_set: continue
        
        target_traits = set(node.get('traits', []))
        shared = source_traits.intersection(target_traits)
        count = len(shared)
        
        if 1 <= count <= 3:
            weak_connections.append({
                "id": nid,
                "sharedCount": count,
                "sharedTraits": list(shared)
            })
            
    weak_connections.sort(key=lambda x: x['sharedCount'], reverse=True)
    return weak_connections