import unittest
from waypoint_selector import select_curvy_waypoints
from graphhopper_api import call_graphhopper_api

class TestGraphhopperIntegration(unittest.TestCase):
    def setUp(self):
        # Use mock segments as before
        self.segments = [
            {'geometry': [(0,0),(0,0.01),(0.01,0.02)], 'road_class':'PRIMARY', 'length':2.0, 'curviness_score':0.5, 'center':(56.96,24.11)},
            {'geometry': [(0,0),(0,0.02),(0.02,0.04)], 'road_class':'TERTIARY', 'length':2.5, 'curviness_score':0.8, 'center':(57.00,25.00)},
            {'geometry': [(0,0),(0,0.005),(0.005,0.01)], 'road_class':'MOTORWAY', 'length':1.0, 'curviness_score':0.1, 'center':(56.98,24.20)},
        ]
        self.start = (56.95, 24.10)
        self.end = (57.13, 27.26)

    def test_graphhopper_api_fast(self):
        waypoints = select_curvy_waypoints(self.start, self.end, self.segments, 'fast')
        try:
            result = call_graphhopper_api(waypoints, profile='car')
            self.assertIn('paths', result)
        except Exception as e:
            self.fail(f"GraphHopper API call failed: {e}")

if __name__ == '__main__':
    unittest.main()
