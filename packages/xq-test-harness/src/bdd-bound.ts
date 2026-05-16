import { createBdd } from 'playwright-bdd';
import { test } from './fixtures/base';

const bdd = createBdd(test);

export const Given = bdd.Given;
export const When = bdd.When;
export const Then = bdd.Then;
export const Step = bdd.Step;
