import requests
from typing import List, Tuple

def call_graphhopper_api(waypoints: List[Tuple[float, float]], profile: str = 'car', base_url: str = 'http://localhost:8989') -> dict:
    """
    Calls the GraphHopper API (hosted) with the given waypoints and profile, using the provided API key.
    Returns the JSON response.
    """
    api_key = '842a5e34-89e5-4bcb-882d-93875c6a5ba4'
    base_url = 'https://graphhopper.com/api/1'
    points = '&'.join([f'point={lat},{lon}' for lat, lon in waypoints])
    url = f"{base_url}/route?{points}&profile={profile}&type=json&points_encoded=false&key={api_key}"
    response = requests.get(url)
    response.raise_for_status()
    return response.json()
