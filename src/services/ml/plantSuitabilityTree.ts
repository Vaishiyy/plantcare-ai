/**
 * Auto-transpiled from STM32 C Decision Tree (plant_suitability_model.c)
 * features[0] = Plant type (0 = Aloe Vera, 1 = Pothos)
 * features[1] = Soil moisture percentage
 * features[2] = Temperature in Celsius
 * features[3] = Air humidity percentage
 * features[4] = LDR ADC reading (0-4095)
 * Returns: 0 = High stress, 1 = Moderate stress, 2 = Suitable
 */
export function predictPlantSuitability(features: number[] | [number, number, number, number, number]): number {
    if (features[1] <= 65.018272) {
        if (features[2] <= 31.949506) {
            if (features[2] <= 17.988172) {
                if (features[3] <= 74.998737) {
                    if (features[4] <= 1069.500000) {
                        if (features[3] <= 45.771276) {
                            if (features[2] <= 10.633482) {
                                return 1;
                            } else {
                                if (features[1] <= 14.929089) {
                                    if (features[2] <= 12.766161) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            if (features[3] <= 57.911783) {
                                if (features[1] <= 5.603089) {
                                    return 0;
                                } else {
                                    if (features[4] <= 658.500000) {
                                        if (features[1] <= 11.047652) {
                                            if (features[4] <= 168.000000) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[1] <= 49.176641) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                }
                            } else {
                                if (features[2] <= 16.914707) {
                                    return 0;
                                } else {
                                    if (features[0] <= 0.500000) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[3] <= 36.369091) {
                            if (features[1] <= 27.830917) {
                                if (features[0] <= 0.500000) {
                                    if (features[3] <= 31.000887) {
                                        if (features[1] <= 10.501837) {
                                            return 0;
                                        } else {
                                            if (features[4] <= 2236.000000) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[2] <= 14.333836) {
                                            if (features[1] <= 5.368726) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[1] <= 51.404408) {
                                    if (features[2] <= 12.986577) {
                                        if (features[3] <= 22.294210) {
                                            return 1;
                                        } else {
                                            if (features[1] <= 49.732740) {
                                                if (features[1] <= 38.563551) {
                                                    return 0;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[3] <= 23.596394) {
                                            return 0;
                                        } else {
                                            if (features[1] <= 35.892422) {
                                                if (features[1] <= 33.770298) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    if (features[3] <= 25.727680) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                }
                            }
                        } else {
                            if (features[1] <= 9.405210) {
                                if (features[2] <= 13.338285) {
                                    if (features[1] <= 3.381202) {
                                        if (features[2] <= 11.933228) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[3] <= 47.414398) {
                                        return 1;
                                    } else {
                                        if (features[2] <= 13.718513) {
                                            return 1;
                                        } else {
                                            if (features[3] <= 74.362453) {
                                                if (features[4] <= 3751.000000) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                }
                            } else {
                                if (features[1] <= 55.737383) {
                                    if (features[2] <= 11.031955) {
                                        if (features[3] <= 50.597433) {
                                            return 0;
                                        } else {
                                            if (features[2] <= 10.656385) {
                                                if (features[4] <= 3000.500000) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[4] <= 2714.500000) {
                                            if (features[0] <= 0.500000) {
                                                if (features[1] <= 33.732792) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            if (features[0] <= 0.500000) {
                                                if (features[4] <= 2865.000000) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                if (features[1] <= 38.152895) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    if (features[0] <= 0.500000) {
                                        if (features[4] <= 2993.500000) {
                                            return 0;
                                        } else {
                                            if (features[3] <= 62.679064) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        }
                    }
                } else {
                    if (features[1] <= 43.114151) {
                        if (features[2] <= 10.246705) {
                            return 1;
                        } else {
                            if (features[3] <= 89.151882) {
                                if (features[2] <= 11.319618) {
                                    if (features[2] <= 11.193178) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[4] <= 2102.500000) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        }
                    } else {
                        if (features[0] <= 0.500000) {
                            return 0;
                        } else {
                            if (features[4] <= 985.000000) {
                                return 0;
                            } else {
                                if (features[4] <= 2935.000000) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                }
            } else {
                if (features[4] <= 998.000000) {
                    if (features[3] <= 77.593178) {
                        if (features[3] <= 31.190189) {
                            if (features[1] <= 24.451825) {
                                if (features[0] <= 0.500000) {
                                    if (features[1] <= 12.907449) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 23.203718) {
                                    if (features[1] <= 30.445490) {
                                        return 1;
                                    } else {
                                        if (features[2] <= 22.549296) {
                                            if (features[4] <= 396.000000) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    }
                                } else {
                                    if (features[4] <= 433.500000) {
                                        if (features[0] <= 0.500000) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        } else {
                            if (features[3] <= 61.018221) {
                                if (features[4] <= 24.500000) {
                                    return 0;
                                } else {
                                    if (features[2] <= 31.087987) {
                                        if (features[4] <= 994.000000) {
                                            if (features[2] <= 30.428080) {
                                                if (features[3] <= 37.554863) {
                                                    return 1;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                if (features[0] <= 0.500000) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                if (features[0] <= 0.500000) {
                                    if (features[1] <= 34.640244) {
                                        if (features[1] <= 9.882876) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[2] <= 29.952458) {
                                        return 1;
                                    } else {
                                        if (features[3] <= 67.025032) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[2] <= 26.763025) {
                            if (features[1] <= 28.793461) {
                                if (features[2] <= 19.817184) {
                                    if (features[2] <= 19.411564) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[4] <= 334.000000) {
                                    return 1;
                                } else {
                                    if (features[4] <= 693.000000) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        } else {
                            return 0;
                        }
                    }
                } else {
                    if (features[3] <= 75.019184) {
                        if (features[3] <= 30.479088) {
                            if (features[0] <= 0.500000) {
                                if (features[4] <= 2412.000000) {
                                    if (features[1] <= 37.088171) {
                                        if (features[1] <= 10.200943) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[3] <= 29.811543) {
                                        return 1;
                                    } else {
                                        if (features[1] <= 41.724207) {
                                            return 2;
                                        } else {
                                            return 1;
                                        }
                                    }
                                }
                            } else {
                                if (features[4] <= 3046.000000) {
                                    if (features[2] <= 30.143552) {
                                        return 1;
                                    } else {
                                        if (features[3] <= 26.401797) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    if (features[1] <= 35.443153) {
                                        return 0;
                                    } else {
                                        if (features[2] <= 29.286740) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    }
                                }
                            }
                        } else {
                            if (features[1] <= 10.035916) {
                                if (features[2] <= 31.869778) {
                                    if (features[4] <= 1254.500000) {
                                        if (features[0] <= 0.500000) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[3] <= 37.297964) {
                                            if (features[4] <= 3045.500000) {
                                                return 1;
                                            } else {
                                                if (features[1] <= 1.756712) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[2] <= 19.876473) {
                                                if (features[3] <= 61.941072) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 36.599636) {
                                    if (features[1] <= 35.112013) {
                                        if (features[4] <= 2374.000000) {
                                            return 1;
                                        } else {
                                            if (features[0] <= 0.500000) {
                                                return 2;
                                            } else {
                                                if (features[1] <= 29.994620) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    if (features[0] <= 0.500000) {
                                        if (features[4] <= 2493.500000) {
                                            if (features[3] <= 60.118952) {
                                                return 1;
                                            } else {
                                                if (features[1] <= 35.428196) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[1] <= 35.175196) {
                                                if (features[3] <= 62.525463) {
                                                    return 2;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    } else {
                                        if (features[1] <= 34.792110) {
                                            if (features[2] <= 30.122482) {
                                                return 1;
                                            } else {
                                                if (features[4] <= 2575.000000) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[4] <= 3038.000000) {
                                                if (features[2] <= 30.054892) {
                                                    return 2;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[1] <= 12.004402) {
                            if (features[3] <= 87.260036) {
                                if (features[3] <= 82.562325) {
                                    if (features[2] <= 29.249898) {
                                        if (features[1] <= 1.562836) {
                                            return 0;
                                        } else {
                                            if (features[1] <= 8.554385) {
                                                return 1;
                                            } else {
                                                if (features[1] <= 10.853181) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                return 1;
                            }
                        } else {
                            if (features[2] <= 30.819487) {
                                if (features[4] <= 3734.000000) {
                                    if (features[1] <= 62.485788) {
                                        if (features[4] <= 1073.000000) {
                                            return 0;
                                        } else {
                                            if (features[3] <= 75.628498) {
                                                if (features[3] <= 75.377056) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            } else {
                                                if (features[2] <= 28.163776) {
                                                    return 1;
                                                } else {
                                                    return 1;
                                                }
                                            }
                                        }
                                    } else {
                                        if (features[2] <= 26.029430) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    if (features[0] <= 0.500000) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                if (features[4] <= 3802.000000) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            if (features[4] <= 939.000000) {
                if (features[3] <= 71.718571) {
                    if (features[1] <= 57.532003) {
                        if (features[2] <= 38.422560) {
                            if (features[3] <= 67.867420) {
                                if (features[2] <= 34.057167) {
                                    if (features[2] <= 33.800562) {
                                        if (features[4] <= 198.000000) {
                                            if (features[2] <= 32.469433) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 69.250114) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            if (features[2] <= 39.283382) {
                                if (features[3] <= 46.914722) {
                                    return 1;
                                } else {
                                    if (features[1] <= 23.310633) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                return 0;
                            }
                        }
                    } else {
                        if (features[0] <= 0.500000) {
                            return 0;
                        } else {
                            return 1;
                        }
                    }
                } else {
                    return 0;
                }
            } else {
                if (features[3] <= 75.000305) {
                    if (features[3] <= 32.436602) {
                        if (features[1] <= 17.322982) {
                            return 0;
                        } else {
                            if (features[3] <= 23.505989) {
                                if (features[2] <= 32.401414) {
                                    return 0;
                                } else {
                                    if (features[2] <= 36.669214) {
                                        return 1;
                                    } else {
                                        if (features[1] <= 30.789882) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    }
                                }
                            } else {
                                if (features[4] <= 3152.500000) {
                                    if (features[2] <= 35.758919) {
                                        if (features[4] <= 1344.000000) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        if (features[1] <= 40.093609) {
                                            if (features[4] <= 2624.000000) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            if (features[0] <= 0.500000) {
                                                if (features[3] <= 28.999210) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    if (features[2] <= 32.254945) {
                                        return 2;
                                    } else {
                                        return 0;
                                    }
                                }
                            }
                        }
                    } else {
                        if (features[4] <= 2535.500000) {
                            if (features[0] <= 0.500000) {
                                if (features[1] <= 34.585562) {
                                    if (features[1] <= 19.494766) {
                                        return 0;
                                    } else {
                                        if (features[3] <= 58.506939) {
                                            return 1;
                                        } else {
                                            if (features[4] <= 2500.500000) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 40.271807) {
                                    if (features[1] <= 32.853356) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 1;
                                }
                            }
                        } else {
                            if (features[1] <= 38.368147) {
                                if (features[0] <= 0.500000) {
                                    if (features[3] <= 59.682871) {
                                        return 1;
                                    } else {
                                        if (features[2] <= 36.571413) {
                                            if (features[1] <= 9.215731) {
                                                return 0;
                                            } else {
                                                if (features[1] <= 31.571552) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            return 0;
                                        }
                                    }
                                } else {
                                    if (features[4] <= 2994.000000) {
                                        return 1;
                                    } else {
                                        if (features[1] <= 34.791878) {
                                            return 0;
                                        } else {
                                            if (features[2] <= 36.835051) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        }
                                    }
                                }
                            } else {
                                if (features[2] <= 39.959909) {
                                    if (features[3] <= 60.032333) {
                                        return 1;
                                    } else {
                                        if (features[0] <= 0.500000) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                } else {
                    if (features[3] <= 84.732227) {
                        if (features[4] <= 2465.000000) {
                            if (features[0] <= 0.500000) {
                                return 0;
                            } else {
                                if (features[1] <= 31.436408) {
                                    return 0;
                                } else {
                                    if (features[4] <= 1214.000000) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        } else {
                            if (features[1] <= 40.575201) {
                                if (features[4] <= 3784.500000) {
                                    if (features[2] <= 32.949467) {
                                        return 0;
                                    } else {
                                        if (features[1] <= 7.378281) {
                                            return 0;
                                        } else {
                                            if (features[2] <= 39.295454) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[4] <= 2631.500000) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        }
                    } else {
                        if (features[2] <= 39.691744) {
                            if (features[3] <= 88.671734) {
                                return 0;
                            } else {
                                if (features[3] <= 88.802135) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        } else {
                            if (features[2] <= 39.849491) {
                                return 1;
                            } else {
                                return 0;
                            }
                        }
                    }
                }
            }
        }
    } else {
        if (features[2] <= 17.628592) {
            if (features[3] <= 61.609623) {
                if (features[3] <= 40.689238) {
                    if (features[4] <= 3049.000000) {
                        return 0;
                    } else {
                        if (features[0] <= 0.500000) {
                            if (features[3] <= 28.152162) {
                                return 0;
                            } else {
                                return 1;
                            }
                        } else {
                            return 0;
                        }
                    }
                } else {
                    if (features[4] <= 987.500000) {
                        return 0;
                    } else {
                        if (features[3] <= 42.572933) {
                            return 1;
                        } else {
                            if (features[0] <= 0.500000) {
                                if (features[4] <= 2592.000000) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                if (features[4] <= 2948.000000) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                }
            } else {
                if (features[1] <= 99.157490) {
                    if (features[3] <= 72.223965) {
                        if (features[3] <= 71.637039) {
                            if (features[3] <= 71.120445) {
                                return 0;
                            } else {
                                if (features[1] <= 89.700752) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        } else {
                            return 1;
                        }
                    } else {
                        return 0;
                    }
                } else {
                    return 1;
                }
            }
        } else {
            if (features[2] <= 31.364478) {
                if (features[3] <= 68.036243) {
                    if (features[3] <= 38.593344) {
                        if (features[0] <= 0.500000) {
                            if (features[3] <= 29.863063) {
                                if (features[4] <= 2550.500000) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                return 1;
                            }
                        } else {
                            if (features[4] <= 2894.500000) {
                                if (features[4] <= 1016.500000) {
                                    return 0;
                                } else {
                                    if (features[2] <= 29.712003) {
                                        if (features[2] <= 17.988334) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                }
                            } else {
                                return 0;
                            }
                        }
                    } else {
                        if (features[3] <= 60.248503) {
                            if (features[2] <= 30.255519) {
                                if (features[4] <= 63.500000) {
                                    if (features[2] <= 22.001162) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 1;
                                }
                            } else {
                                if (features[2] <= 30.547125) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            }
                        } else {
                            if (features[2] <= 20.969563) {
                                if (features[4] <= 2583.500000) {
                                    if (features[0] <= 0.500000) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    if (features[2] <= 18.089808) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            } else {
                                if (features[1] <= 99.036171) {
                                    if (features[3] <= 60.799435) {
                                        if (features[0] <= 0.500000) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 1;
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                } else {
                    if (features[4] <= 1098.000000) {
                        if (features[1] <= 67.064690) {
                            if (features[2] <= 25.454085) {
                                return 0;
                            } else {
                                return 1;
                            }
                        } else {
                            if (features[3] <= 69.121746) {
                                if (features[3] <= 68.774754) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                return 0;
                            }
                        }
                    } else {
                        if (features[2] <= 25.657125) {
                            if (features[2] <= 18.156475) {
                                if (features[3] <= 78.498177) {
                                    return 1;
                                } else {
                                    return 0;
                                }
                            } else {
                                if (features[3] <= 70.151966) {
                                    if (features[3] <= 68.584469) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[4] <= 3377.500000) {
                                        if (features[0] <= 0.500000) {
                                            if (features[4] <= 2533.500000) {
                                                return 0;
                                            } else {
                                                return 1;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        if (features[3] <= 75.250378) {
                                            return 1;
                                        } else {
                                            if (features[0] <= 0.500000) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            if (features[2] <= 26.551253) {
                                return 0;
                            } else {
                                if (features[3] <= 75.544613) {
                                    if (features[1] <= 98.408157) {
                                        if (features[3] <= 71.043095) {
                                            if (features[1] <= 84.143566) {
                                                return 1;
                                            } else {
                                                return 0;
                                            }
                                        } else {
                                            return 1;
                                        }
                                    } else {
                                        return 0;
                                    }
                                } else {
                                    if (features[3] <= 89.359459) {
                                        if (features[4] <= 2077.500000) {
                                            if (features[0] <= 0.500000) {
                                                return 0;
                                            } else {
                                                if (features[2] <= 29.885304) {
                                                    return 1;
                                                } else {
                                                    return 0;
                                                }
                                            }
                                        } else {
                                            if (features[0] <= 0.500000) {
                                                if (features[4] <= 2664.500000) {
                                                    return 0;
                                                } else {
                                                    return 1;
                                                }
                                            } else {
                                                return 0;
                                            }
                                        }
                                    } else {
                                        return 1;
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                if (features[3] <= 74.542130) {
                    if (features[4] <= 1003.500000) {
                        if (features[2] <= 31.761443) {
                            return 1;
                        } else {
                            return 0;
                        }
                    } else {
                        if (features[3] <= 30.655487) {
                            if (features[2] <= 31.728934) {
                                if (features[2] <= 31.684003) {
                                    return 0;
                                } else {
                                    return 1;
                                }
                            } else {
                                return 0;
                            }
                        } else {
                            if (features[4] <= 3063.500000) {
                                if (features[0] <= 0.500000) {
                                    if (features[4] <= 2568.000000) {
                                        if (features[2] <= 31.923849) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    } else {
                                        if (features[3] <= 57.498825) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    }
                                } else {
                                    if (features[3] <= 39.539402) {
                                        return 0;
                                    } else {
                                        return 1;
                                    }
                                }
                            } else {
                                if (features[0] <= 0.500000) {
                                    if (features[3] <= 59.885983) {
                                        return 1;
                                    } else {
                                        if (features[4] <= 3775.000000) {
                                            return 0;
                                        } else {
                                            return 1;
                                        }
                                    }
                                } else {
                                    return 0;
                                }
                            }
                        }
                    }
                } else {
                    return 0;
                }
            }
        }
    }
}