import unittest
from curviness import compute_curviness
from waypoint_selector import select_curvy_waypoints

class TestCurvyRouting(unittest.TestCase):
    def setUp(self):
        # Mock segments with geometry and road_class
        self.segments = [
            {'geometry': [(0,0),(0,0.01),(0.01,0.02)], 'road_class':'PRIMARY', 'length':2.0, 'curviness_score':0.5, 'center':(0.005,0.01)},
            {'geometry': [(0,0),(0,0.02),(0.02,0.04)], 'road_class':'TERTIARY', 'length':2.5, 'curviness_score':0.8, 'center':(0.01,0.02)},
            {'geometry': [(0,0),(0,0.005),(0.005,0.01)], 'road_class':'MOTORWAY', 'length':1.0, 'curviness_score':0.1, 'center':(0.0025,0.005)},
        ]
        self.start = (56.95, 24.10)
        self.end = (57.13, 27.26)

    def test_fast_profile(self):
        waypoints = select_curvy_waypoints(self.start, self.end, self.segments, 'fast')
        self.assertEqual(waypoints[0], self.start)
        self.assertEqual(waypoints[-1], self.end)
        self.assertTrue(len(waypoints) >= 2)

    def test_very_curvy_profile(self):
        waypoints = select_curvy_waypoints(self.start, self.end, self.segments, 'very_curvy')
        self.assertEqual(waypoints[0], self.start)
        self.assertEqual(waypoints[-1], self.end)
        # Only segments with curviness_score >= 0.7
        for wp in waypoints[1:-1]:
            self.assertIn(wp, [self.segments[1]['center']])

if __name__ == '__main__':
    unittest.main()
