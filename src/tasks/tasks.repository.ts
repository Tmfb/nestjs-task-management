import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { User } from "../users/user.entity";
import { DataSource, Repository } from "typeorm";
import { CreateTaskDto } from "./dto/create-task.dto";
import { GetTaskFilterDto } from "./dto/get-tasks-filter.dto";
import { Task } from "./task.entity";
import { TaskStatus } from "./task-status.enum";
import { Result, ResultStates } from "src/result.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { UsersRepository } from "../auth/auth.repository";
import { STATUS_CODES } from "http";

@Injectable()
export class TasksRepository extends Repository<Task> {
  private logger = new Logger("TasksRepository", { timestamp: true });

  constructor(
    private dataSource: DataSource,
    @InjectRepository(UsersRepository)
    private usersRepository: UsersRepository
  ) {
    super(Task, dataSource.createEntityManager());
  }

  //Database logic

  async getTasks(filterDto: GetTaskFilterDto, user: User): Promise<Result> {
    const { status, search } = filterDto;

    const query = this.createQueryBuilder("task");
    query
      .leftJoinAndSelect("task.project", "project")
      .leftJoinAndSelect("task.resolver", "resolver")
      .leftJoinAndSelect("task.admin", "admin")
      .where([{ admin: user }, { resolver: user }]);
    //status filter
    if (status) {
      query.andWhere({ status: status });
    }

    //search pattern matching
    if (search) {
      query.andWhere(
        "(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))",
        { search: `%${search}%` }
      );
    }

    try {
      const tasks = await query.getMany();
      return new Result(ResultStates.OK, tasks);
    } catch (error) {
      this.logger.error(
        `Failed to fetch tasks for User "${
          user.username
        }". Filters: ${JSON.stringify(filterDto)}`,
        error.stack
      );
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }
  }

  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Result> {
    const { title, description, resolverUserId } = createTaskDto;
    const task: Task = this.create({
      title,
      description,
      status: TaskStatus.OPEN,
      admin: user,
      resolver: user,
      project: null,
    });

    if (resolverUserId) {
      try {
        const found = await this.usersRepository.findOne({
          where: {
            id: resolverUserId,
          },
        });
        if (!found) {
          return new Result(ResultStates.ERROR, {
            message: `User with id ${resolverUserId} not found`,
            statusCode: HttpStatus.NOT_FOUND,
          });
        }
        task.resolver = found;
      } catch (error) {
        return new Result(ResultStates.ERROR, {
          message: error.message,
          statusCode: error.statusCode,
        });
      }
    }

    try {
      await this.save(task);
    } catch (error) {
      this.logger.error(
        `Failed to save new task: ${task} owned by User: ${user}`,
        error.stack
      );
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return new Result(ResultStates.OK, task);
  }

  async updateTaskResolver(
    taskId: string,
    resolverId: string,
    user: User
  ): Promise<Result> {
    let foundTask: Task, foundResolver: User;
    const query = this.createQueryBuilder("task");
    query
      .leftJoinAndSelect("task.resolver", "resolver")
      .where({ admin: user })
      .andWhere({ id: taskId });

    // Try fetching the task if it exists and authed user is admin
    try {
      foundTask = await query.getOne();
    } catch (error) {
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    // If Query returns empty either task doesn't exist or authed user is not admin
    if (!foundTask) {
      return new Result(ResultStates.ERROR, {
        message: `Task with id ${taskId} not found or you don't have permision to modify it's resolver`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Check if new resolver is already the task resolver
    if (foundTask.resolver.id == resolverId) {
      return new Result(ResultStates.ERROR, {
        message: `User with id ${resolverId} is already a resolver for task with id ${taskId}`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }
    // Fetch resolver user
    try {
      foundResolver = await this.usersRepository.findOne({
        where: { id: resolverId },
      });
    } catch (error) {
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    if (!foundResolver) {
      return new Result(ResultStates.ERROR, {
        message: `User with id ${resolverId} does not exist`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Modify task resolver
    foundTask.resolver = foundResolver;

    // Update the database
    try {
      this.save(foundTask);
      return new Result(ResultStates.OK, foundTask);
    } catch (error) {
      // Log any error and foward it to the controller encapsulated in a Result
      this.logger.error(
        `Failed to update resolver of task with id ${taskId}`,
        error.stack
      );
      return new Result(ResultStates.ERROR, {
        message: `Failed to update project of task with id ${taskId}`,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }

  async updateTaskProject(
    id: string,
    project: string,
    user: User
  ): Promise<Result> {
    let found;
    const query = this.createQueryBuilder("task");
    query.where({ admin: user });
    query.andWhere({ id: id });

    // Try fetching the task if it exists and authed user is admin
    try {
      found = await query.getOne();
    } catch (error) {
      return new Result(ResultStates.ERROR, {
        message: error.message,
        statusCode: error.statusCode,
      });
    }

    // If Query returns empty either task doesn't exist or authed user is not admin
    if (!found) {
      return new Result(ResultStates.ERROR, {
        message: `Task with id ${id} not found or you don't have permision to modify it's project`,
        statusCode: HttpStatus.BAD_REQUEST,
      });
    }

    // Modify task project
    found.project = project;

    // Update the database
    try {
      this.save(found);
      return new Result(ResultStates.OK, found);
    } catch (error) {
      // Log any error and foward it to the controller encapsulated in a Result
      this.logger.error(
        `Failed to update project of task with id ${id}`,
        error.stack
      );
      return new Result(ResultStates.ERROR, {
        message: `Failed to update project of task with id ${id}`,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
