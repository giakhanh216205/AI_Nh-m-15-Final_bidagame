class GeneticAlgorithm {
    constructor(populationSize, mutationRate, simulation) {
        this.populationSize = populationSize;
        this.mutationRate = mutationRate;
        this.simulation = simulation;
        this.population = new Map();
        this.bestPopulation = new Map();
        this.potentialPopulation = new Map();
        this.cache = new Map();
    }

    initializePopulation() {
        while (this.population.size < this.populationSize) {
            const individual = {
                angle: Math.random() * 360 - 180,
                power: Math.random() * 200,
                fitness: -Infinity,
            };
            const key = this.hash(individual.angle, individual.power);
            if (!this.population.has(key)) this.population.set(key, individual);
        }
    }

    hash(angle, power) {
        return `${angle.toFixed(2)}-${power.toFixed(2)}`;
    }

    evaluateFitness(keyPopulation) {
        let { angle, power } = this.population.get(keyPopulation);
        const key = this.hash(angle, power);
        if (this.cache.get(keyPopulation)) return this.cache.get(keyPopulation);

        let result = simulateShot(
            angle,
            power,
            this.simulation.whiteBall,
            this.simulation.balls,
            this.simulation.holes
        );

        let fitness = 0;
        let gameType = this.simulation.gameType;
        let isBreak = this.simulation.isBreak;

        if (gameType === '9ball') {
            let lowestBall = null;
            for (let b of this.simulation.balls) {
                if (!lowestBall || b.number < lowestBall.number) lowestBall = b;
            }
            
            let isFoul = result.whiteBallInHole || result.firstHit === null;
            if (!isBreak && lowestBall && result.firstHit !== lowestBall.number) isFoul = true;

            if (result.ninePotted) {
                if (!isFoul) fitness = 10000;
                else fitness = -5000;
            } else if (isFoul) {
                fitness = -5000;
            } else {
                fitness = result.anyPottedCount * 1000 - result.distanceToHole;
            }
        } else {
            let botType = this.simulation.botType;
            let targetCount = 0;
            let enemyCount = 0;
            let remainTarget = this.simulation.balls.filter(b => b.type === botType).length;

            if (botType === BallType.SOLID) {
                targetCount = result.solidsPotted;
                enemyCount = result.stripesPotted;
            } else if (botType === BallType.STRIPE) {
                targetCount = result.stripesPotted;
                enemyCount = result.solidsPotted;
            } else {
                targetCount = result.solidsPotted + result.stripesPotted;
            }

            let firstHitType = null;
            if (result.firstHit !== null) {
                if (result.firstHit === 8) firstHitType = BallType.EIGHT;
                else if (result.firstHit < 8) firstHitType = BallType.SOLID;
                else firstHitType = BallType.STRIPE;
            }

            let isFoul = result.whiteBallInHole || result.firstHit === null;
            if (!isBreak) {
                if (botType !== null && remainTarget > 0 && firstHitType !== botType) isFoul = true;
                if (botType !== null && remainTarget === 0 && firstHitType !== BallType.EIGHT) isFoul = true;
                if (botType === null && firstHitType === BallType.EIGHT) isFoul = true;
            }

            if (result.eightPotted) {
                if (botType !== null && remainTarget === 0 && !isFoul) {
                    fitness = 10000; 
                } else {
                    fitness = -10000; 
                }
            } else if (isFoul) {
                fitness = -5000;
            } else {
                fitness = targetCount * 1000 - enemyCount * 500 - result.distanceToHole;
            }
        }

        if (fitness > 0 && fitness < 4000) {
            if (!this.potentialPopulation.has(key)) {
                this.potentialPopulation.set(keyPopulation, { angle, power, fitness });
                this.population.delete(keyPopulation);
            }
        }
        if (fitness >= 4000) {
            if (!this.bestPopulation.has(key)) {
                this.bestPopulation.set(keyPopulation, { angle, power, fitness });
                this.population.delete(keyPopulation);
            }
        }
        this.population.set(keyPopulation, { angle, power, fitness });
        this.cache.set(keyPopulation, { angle, power, fitness });

        return this.cache.get(keyPopulation);
    }

    selectParent() {
        let populationArray = Array.from(this.population.values());
        let totalFitness = populationArray.reduce((sum, individual) => {
            let fitness = individual.fitness === -Infinity
                ? this.evaluateFitness(this.hash(individual.angle, individual.power)).fitness
                : individual.fitness;
            return sum + Math.max(0, fitness);
        }, 0);

        if (totalFitness === 0) return populationArray[Math.floor(Math.random() * populationArray.length)];

        let randomValue = Math.random() * totalFitness;
        for (let individual of populationArray) {
            randomValue -= Math.max(0, individual.fitness);
            if (randomValue <= 0) return individual;
        }
        return populationArray[0];
    }

    crossover(parent1, parent2) {
        return {
            angle: ((parent1.angle + (Math.random() - 0.5) * (parent2.angle - parent1.angle) + 180) % 360) - 180,
            power: Math.max(0, Math.min(200, parent1.power + (Math.random() - 0.5) * (parent2.power - parent1.power))),
        };
    }

    mutate(shot) {
        if (Math.random() < this.mutationRate) {
            const angleRange = Math.random() < 0.1 ? 90 : 10;
            const powerRange = Math.random() < 0.1 ? 100 : 20;
            shot.angle += (Math.random() - 0.5) * angleRange;
            shot.angle = ((shot.angle + 180) % 360) - 180;
            shot.power += (Math.random() - 0.5) * powerRange;
            shot.power = Math.max(0, Math.min(200, shot.power));
        }
        return shot;
    }

    run(generations) {
        this.initializePopulation();
        for (let gen = 0; gen < generations; gen++) {
            let newPopulation = new Map();
            let remainingSize = this.population.size;
            while (newPopulation.size < remainingSize) {
                let parent1 = this.selectParent();
                let parent2 = this.selectParent();
                let offspring = this.mutate(this.crossover(parent1, parent2));
                const key = this.hash(offspring.angle, offspring.power);
                if (!newPopulation.has(key)) newPopulation.set(key, { ...offspring, fitness: -Infinity });
            }
            this.population = newPopulation;
        }
        this.population.forEach((individual, key) => {
            if (individual.fitness === -Infinity) this.evaluateFitness(key);
        });
        this.population = new Map([...this.population, ...this.potentialPopulation, ...this.bestPopulation]);
        let sortedPopulation = Array.from(this.population.values()).sort((a, b) => b.fitness - a.fitness);
        return sortedPopulation[0];
    }
}

class MonteCarloTreeSearch {
    constructor(iterations, simulation) {
        this.simulation = simulation;
        this.iterations = iterations;
    }

    findBestShot(initialPopulation) {
        let bestShot = { angle: 0, power: 0, fitness: -Infinity };
        let populationArray = Array.from(initialPopulation.values());

        for (let i = 0; i < this.iterations; i++) {
            let shot = populationArray[i % populationArray.length];
            let fitness = this.simulateShot(shot.angle, shot.power);

            if (fitness > bestShot.fitness) {
                bestShot = { ...shot, fitness };
            }
        }
        return bestShot;
    }

    simulateShot(angle, power, simulations = 3) {
        let totalFitness = 0;
        for (let i = 0; i < simulations; i++) {
            let result = simulateShot(angle, power, this.simulation.whiteBall, this.simulation.balls, this.simulation.holes);
            let gameType = this.simulation.gameType;
            
            if (gameType === '9ball') {
                let lowestBall = null;
                for (let b of this.simulation.balls) {
                    if (!lowestBall || b.number < lowestBall.number) lowestBall = b;
                }
                
                let isFoul = result.whiteBallInHole || result.firstHit === null;
                if (!this.simulation.isBreak && lowestBall && result.firstHit !== lowestBall.number) isFoul = true;

                if (result.ninePotted) {
                    if (!isFoul) totalFitness += 10000;
                    else totalFitness -= 5000;
                } else if (isFoul) {
                    totalFitness -= 5000;
                } else {
                    totalFitness += (result.anyPottedCount * 1000 - result.distanceToHole);
                }
            } else {
                let targetCount = 0;
                let enemyCount = 0;
                let botType = this.simulation.botType;
                let remainTarget = this.simulation.balls.filter(b => b.type === botType).length;
                
                if (botType === BallType.SOLID) { targetCount = result.solidsPotted; enemyCount = result.stripesPotted; }
                else if (botType === BallType.STRIPE) { targetCount = result.stripesPotted; enemyCount = result.solidsPotted; }
                else { targetCount = result.solidsPotted + result.stripesPotted; }

                let firstHitType = null;
                if (result.firstHit !== null) {
                    if (result.firstHit === 8) firstHitType = BallType.EIGHT;
                    else if (result.firstHit < 8) firstHitType = BallType.SOLID;
                    else firstHitType = BallType.STRIPE;
                }

                let isFoul = result.whiteBallInHole || result.firstHit === null;
                if (!this.simulation.isBreak) {
                    if (botType !== null && remainTarget > 0 && firstHitType !== botType) isFoul = true;
                    if (botType !== null && remainTarget === 0 && firstHitType !== BallType.EIGHT) isFoul = true;
                    if (botType === null && firstHitType === BallType.EIGHT) isFoul = true;
                }

                if (result.eightPotted) {
                    if (botType !== null && remainTarget === 0 && !isFoul) totalFitness += 10000;
                    else totalFitness -= 10000;
                } else if (isFoul) {
                    totalFitness -= 5000;
                } else {
                    totalFitness += (targetCount * 1000 - enemyCount * 500 - result.distanceToHole);
                }
            }
        }
        return totalFitness / simulations;
    }
}

class AITrainer {
    constructor(state) {
        this.state = state;
        this.geneticAlgorithm = new GeneticAlgorithm(50, 0.15, state);
        this.mcts = new MonteCarloTreeSearch(100, state);
    }

    train() {
        let bestGeneticShot = this.geneticAlgorithm.run(10);
        let bestMCTSShot = this.mcts.findBestShot(this.geneticAlgorithm.population);
        return bestMCTSShot.fitness > bestGeneticShot.fitness ? bestMCTSShot : bestGeneticShot;
    }
}