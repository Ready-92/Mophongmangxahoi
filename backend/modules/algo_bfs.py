from collections import deque

def find_shortest_path(start_id, end_id, adjacency_map):
    if start_id == end_id: return [start_id]
    
    queue = deque([[start_id]])
    visited = {start_id}
    
    while queue:
        path = queue.popleft()
        node = path[-1]
        
        if node == end_id: return path
        
        for neighbor in adjacency_map.get(node, []):
            if neighbor not in visited:
                visited.add(neighbor)
                new_path = list(path)
                new_path.append(neighbor)
                queue.append(new_path)
    return None